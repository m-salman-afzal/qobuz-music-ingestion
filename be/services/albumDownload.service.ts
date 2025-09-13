import axios from "axios";
import {promises as fs} from "fs";
import path from "path";
import {AlbumRepository, AlbumData} from "../infra/database/repositories/album.repo";
import {TrackRepository, TrackWithAlbumAndArtistAndGenre} from "../infra/database/repositories/track.repository";
import {MusicUrlService} from "./musicUrl.service";
import {ConfigService} from "./config.service";

export interface AlbumWithTracksAndDetails {
    album: AlbumData;
    tracks: TrackWithAlbumAndArtistAndGenre[];
}

export class AlbumDownloadService {
    private static downloadsDir = path.join(process.cwd(), "downloads");

    private static async ensureDownloadsDir(): Promise<void> {
        try {
            await fs.access(this.downloadsDir);
        } catch {
            await fs.mkdir(this.downloadsDir, {recursive: true});
        }
    }

    private static async downloadAlbumCover(album: AlbumData, folderPath: string): Promise<boolean> {
        const imageLarge = album.data?.image?.large;
        const imageThumbnail = album.data?.image?.thumbnail;
        const imageSmall = album.data?.image?.small;
        const imageBack = album.data?.image?.back;

        if (!imageLarge && !imageThumbnail && !imageSmall && !imageBack) {
            return false;
        }

        let coverUrl = imageLarge;
        const coverFileName = "cover.jpg";
        const coverFilePath = path.join(folderPath, coverFileName);

        // Priority order: back > small > thumbnail > large
        if (imageThumbnail) {
            coverUrl = imageThumbnail;
        }

        if (imageSmall) {
            coverUrl = imageSmall;
        }

        if (imageBack) {
            coverUrl = imageBack;
        }

        if (coverUrl) {
            try {
                const coverResponse = await axios.get(coverUrl, {
                    responseType: "arraybuffer",
                    timeout: 60000
                });

                await fs.writeFile(coverFilePath, Buffer.from(coverResponse.data));
                console.log(`Saved album cover for album ${album.data?.id ?? album.rId} to ${coverFilePath}`);
                return true;
            } catch (coverError) {
                console.warn(`Failed to download album cover for album ${album.data?.id ?? album.rId}:`, coverError);
            }
        }

        return false;
    }

    private static async downloadTrackForAlbum(
        track: TrackWithAlbumAndArtistAndGenre,
        folderPath: string,
        trackNumber: number
    ): Promise<boolean> {
        if (!track.tracks?.data?.id) {
            throw new Error("Track not found or missing ID");
        }

        try {
            await TrackRepository.updateDownloadStatus(track.tracks.data.id, "PROCESSING", folderPath);

            const urlResult = await MusicUrlService.getDownloadUrl({
                track_id: track.tracks.data.id,
                quality: "27"
            });

            let response;
            try {
                response = await axios.get(urlResult.data?.url ?? "", {
                    responseType: "arraybuffer",
                    timeout: 300000
                });
            } catch (error: any) {
                console.error(`Error downloading track ${track.tracks.data.id}:`, error);
                throw error;
            }

            console.log(`Downloaded ${response.data.byteLength} bytes for track ${track.tracks.data.id}`);

            const trackTitle = track.tracks.data.title ? track.tracks.data.title : `Track_${track.tracks.data.id}`;

            const fileName = `${trackNumber} - ${trackTitle}.flac`;
            const filePath = path.join(folderPath, fileName);

            await fs.writeFile(filePath, Buffer.from(response.data));
            console.log(`Saved track ${track.tracks.data.id} to ${filePath}`);

            await TrackRepository.updateDownloadStatus(track.tracks.data.id, "SUCCESS");
            console.log(`Updated track ${track.tracks.data.id} status to success`);

            return true;
        } catch (error) {
            console.error(`Error downloading track ${track.tracks.data?.id}:`, error);

            try {
                await TrackRepository.updateDownloadStatus(track.tracks.data?.id ?? 0, "FAILED");
                console.log(`Updated track ${track.tracks.data?.id} status to failed`);
            } catch (updateError) {
                console.error(`Failed to update track ${track.tracks.data?.id} status to failed:`, updateError);
            }

            return false;
        }
    }

    private static async downloadAlbum(albumData: AlbumWithTracksAndDetails): Promise<{
        success: boolean;
        downloadedTracks: number;
        failedTracks: number;
        errors: string[];
    }> {
        const {album, tracks} = albumData;
        const errors: string[] = [];
        let downloadedTracks = 0;
        let failedTracks = 0;

        if (tracks.length === 0) {
            return {
                success: false,
                downloadedTracks: 0,
                failedTracks: 0,
                errors: ["No tracks found for album"]
            };
        }

        try {
            await AlbumRepository.updateByQobuzId(Number(album.data?.qobuz_id), {
                downloadStatus: "PROCESSING"
            });

            await this.ensureDownloadsDir();

            const firstTrack = tracks[0];
            const albumTitle = firstTrack.albums?.data?.title ? firstTrack.albums.data.title : "Unknown Album";
            const artistName = firstTrack.artists?.name ? firstTrack.artists.name : "Unknown Artist";
            const genreName = firstTrack.genres?.name ? firstTrack.genres.name : "Unknown Genre";
            const releaseYear = firstTrack.albums?.data?.released_at
                ? new Date(Number(firstTrack.albums.data.released_at) * 1000).getFullYear()
                : "Unknown Release Year";

            const sanitize = (str: string) =>
                str
                    .replace(/[<>:"'/\\|?*\u0000-\u001F]/g, "")
                    .replace(/''/g, "")
                    .replace(/\s+/g, " ")
                    .trim();

            const albumFolderTitle = `${sanitize(albumTitle)} --- ${sanitize(genreName)} --- ${sanitize(String(releaseYear))}`;
            const folderPath = path.join(this.downloadsDir, artistName, albumFolderTitle);

            try {
                await fs.access(folderPath);
            } catch {
                await fs.mkdir(folderPath, {recursive: true});
            }

            await this.downloadAlbumCover(album, folderPath);

            for (const [index, track] of tracks.entries()) {
                try {
                    const success = await this.downloadTrackForAlbum(track, folderPath, index + 1);
                    if (success) {
                        downloadedTracks++;
                    } else {
                        failedTracks++;
                        const errorMsg = `Failed to download track ${track.tracks?.data?.id}`;
                        console.error(errorMsg);
                        errors.push(errorMsg);
                    }
                } catch (error) {
                    failedTracks++;
                    const errorMsg = `Error processing track ${track.tracks?.data?.id}: ${error instanceof Error ? error.message : "Unknown error"}`;
                    console.error(errorMsg);
                    errors.push(errorMsg);
                }
            }

            // Update album status based on results
            const albumStatus = failedTracks === 0 ? "SUCCESS" : downloadedTracks > 0 ? "SUCCESS" : "FAILED";

            await AlbumRepository.updateByQobuzId(Number(album.data?.qobuz_id), {
                downloadStatus: albumStatus
            });

            return {
                success: downloadedTracks > 0,
                downloadedTracks,
                failedTracks,
                errors
            };
        } catch (error) {
            console.error(`Error downloading album ${album.data?.id}:`, error);

            try {
                await AlbumRepository.updateByQobuzId(Number(album.data?.qobuz_id), {
                    downloadStatus: "FAILED"
                });
            } catch (updateError) {
                console.error(`Failed to update album ${album.data?.id} status to failed:`, updateError);
            }

            const errorMsg = `Error downloading album ${album.data?.id}: ${error instanceof Error ? error.message : "Unknown error"}`;
            errors.push(errorMsg);

            return {
                success: false,
                downloadedTracks,
                failedTracks,
                errors
            };
        }
    }

    static async processPendingAlbumDownloads(albumCountToDownload: number): Promise<{
        processed: number;
        successful: number;
        failed: number;
        totalTracksDownloaded: number;
        totalTracksFailed: number;
        errors: string[];
    }> {
        const errors: string[] = [];
        let processed = 0;
        let successful = 0;
        let failed = 0;
        let totalTracksDownloaded = 0;
        let totalTracksFailed = 0;

        try {
            const pendingAlbums = await AlbumRepository.findAlbumsByDownloadStatus("PENDING", albumCountToDownload);

            if (pendingAlbums.length === 0) {
                return {
                    processed: 0,
                    successful: 0,
                    failed: 0,
                    totalTracksDownloaded: 0,
                    totalTracksFailed: 0,
                    errors: []
                };
            }

            for (const album of pendingAlbums) {
                processed++;

                try {
                    const tracks = await TrackRepository.findTracksByAlbumRId(album.rId);

                    const result = await this.downloadAlbum({
                        album,
                        tracks
                    });

                    totalTracksDownloaded += result.downloadedTracks;
                    totalTracksFailed += result.failedTracks;
                    errors.push(...result.errors);

                    if (result.success) {
                        successful++;
                    } else {
                        failed++;
                        const errorMsg = `Failed to download album ${album.data?.id}`;
                        console.error(errorMsg);
                        errors.push(errorMsg);
                    }
                } catch (error) {
                    failed++;
                    const errorMsg = `Error processing album ${album.data?.id}: ${error instanceof Error ? error.message : "Unknown error"}`;
                    console.error(errorMsg);
                    errors.push(errorMsg);
                }
            }
        } catch (error) {
            const errorMsg = `Error fetching pending albums: ${error instanceof Error ? error.message : "Unknown error"}`;
            console.error(errorMsg);
            errors.push(errorMsg);
        }

        const [config] = await ConfigService.getConfig();
        if (!config.data) {
            throw new Error("Config not found");
        }
        config.data.isAlbumsProcessing = false;
        await ConfigService.updateConfig(config);

        return {
            processed,
            successful,
            failed,
            totalTracksDownloaded,
            totalTracksFailed,
            errors
        };
    }
}
