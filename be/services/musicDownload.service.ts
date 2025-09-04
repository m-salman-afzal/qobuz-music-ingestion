import axios from "axios";
import {promises as fs} from "fs";
import path from "path";
import {TrackRepository, TrackWithAlbumAndArtistAndGenre} from "../infra/database/repositories/track.repository";
import {MusicUrlService} from "./musicUrl.service";

export class MusicDownloadService {
    private static downloadsDir = path.join(process.cwd(), "downloads");

    private static async ensureDownloadsDir(): Promise<void> {
        try {
            await fs.access(this.downloadsDir);
        } catch {
            await fs.mkdir(this.downloadsDir, {recursive: true});
        }
    }

    private static async downloadTrack(track: TrackWithAlbumAndArtistAndGenre): Promise<boolean> {
        if (!track.tracks) {
            throw new Error("Track not found");
        }

        try {
            console.log(`Starting download for track ID: ${track.tracks.data?.id}`);

            // Update status to processing
            await TrackRepository.updateDownloadStatus(track.tracks?.data?.id ?? 0, "PROCESSING");
            console.log(`Updated track ${track.tracks?.data?.id} status to processing`);

            const urlResult = await MusicUrlService.getDownloadUrl({
                track_id: track.tracks.data?.id ?? 0,
                quality: "27"
            });

            let response;
            try {
                response = await axios.get(urlResult.data?.url ?? "", {
                    responseType: "arraybuffer",
                    timeout: 300000
                });
            } catch (error: any) {
                console.error(`Error downloading track ${track.tracks.data?.id}:`, error);
                throw error;
            }

            console.log(`Downloaded ${response.data.byteLength} bytes for track ${track.tracks.data?.id}`);

            await this.ensureDownloadsDir();

            const albumTitle = track.albums?.data?.title ? track.albums.data.title : "Unknown Album";
            const artistName = track.artists?.name ? track.artists.name : "Unknown Artist";
            const genreName = track.genres?.name ? track.genres.name : "Unknown Genre";
            const trackTitle = track.tracks.data?.title ? track.tracks.data.title : `Track_${track.tracks.data?.id}`;
            const releaseYear = track.albums?.data?.released_at
                ? new Date(Number(track.albums.data.released_at) * 1000).getFullYear()
                : "Unknown Release Year";

            const albumFolderTitle = `${albumTitle} --- ${genreName} --- ${releaseYear}`;
            const folderPath = path.join(this.downloadsDir, artistName, albumFolderTitle);

            try {
                await fs.access(folderPath);
            } catch {
                await fs.mkdir(folderPath, {recursive: true});
            }

            const fileName = `${trackTitle}.flac`;
            const filePath = path.join(folderPath, fileName);

            await fs.writeFile(filePath, Buffer.from(response.data));
            console.log(`Saved track ${track.tracks.data?.id} to ${filePath}`);

            await this.downloadAlbumCover(track, folderPath);

            await TrackRepository.updateDownloadStatus(track.tracks.data?.id ?? 0, "SUCCESS");
            console.log(`Updated track ${track.tracks.data?.id} status to success`);

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

    private static async downloadAlbumCover(
        track: TrackWithAlbumAndArtistAndGenre,
        folderPath: string
    ): Promise<boolean> {
        const imageLarge = track.albums?.data?.image?.large;
        const imageThumbnail = track.albums?.data?.image?.thumbnail;
        const imageSmall = track.albums?.data?.image?.small;
        const imageBack = track.albums?.data?.image?.back;

        if (!imageLarge && !imageThumbnail && !imageSmall && !imageBack) {
            return false;
        }

        let coverUrl = imageLarge;
        const coverFileName = "cover.jpg";
        const coverFilePath = path.join(folderPath, coverFileName);

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
                console.log(`Saved album cover for track ${track.tracks?.data?.id ?? 0} to ${coverFilePath}`);
            } catch (coverError) {
                console.warn(`Failed to download album cover for track ${track.tracks?.data?.id ?? 0}:`, coverError);
            }
        }

        return true;
    }

    static async processPendingDownloads(): Promise<{
        processed: number;
        successful: number;
        failed: number;
        errors: string[];
    }> {
        console.log("Starting to process pending downloads...");

        const errors: string[] = [];
        let processed = 0;
        let successful = 0;
        let failed = 0;

        try {
            const pendingTracks = await TrackRepository.findPendingDownloads();
            console.log(`Found ${pendingTracks.length} pending tracks`);

            if (pendingTracks.length === 0) {
                return {processed: 0, successful: 0, failed: 0, errors: []};
            }

            for (const track of pendingTracks) {
                processed++;
                console.log(`Processing track ${processed}/${pendingTracks.length}: ID ${track.tracks.data?.id}`);

                try {
                    const success = await this.downloadTrack(track);
                    if (success) {
                        successful++;
                        console.log(`Successfully downloaded track ${track.tracks.data?.id}`);
                    } else {
                        failed++;
                        const errorMsg = `Failed to download track ${track.tracks.data?.id}`;
                        console.error(errorMsg);
                        errors.push(errorMsg);
                    }
                } catch (error) {
                    failed++;
                    const errorMsg = `Error processing track ${track.tracks.data?.id}: ${error instanceof Error ? error.message : "Unknown error"}`;
                    console.error(errorMsg);
                    errors.push(errorMsg);
                }

                if (processed < pendingTracks.length) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }
        } catch (error) {
            const errorMsg = `Error fetching pending tracks: ${error instanceof Error ? error.message : "Unknown error"}`;
            console.error(errorMsg);
            errors.push(errorMsg);
        }

        console.log(
            `Download processing complete. Processed: ${processed}, Successful: ${successful}, Failed: ${failed}`
        );

        return {
            processed,
            successful,
            failed,
            errors
        };
    }
}
