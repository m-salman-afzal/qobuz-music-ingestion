import {getAlbumInfo, QobuzAlbum, QobuzSearchResults} from "../../lib/qobuz-dl";
import {ArtistRepository, CreateArtistData} from "../infra/database/repositories/artist.repo";
import {GenreRepository, CreateGenreData} from "../infra/database/repositories/genre.repo";
import {LabelRepository, CreateLabelData} from "../infra/database/repositories/label.repo";
import {AlbumRepository, CreateAlbumData} from "../infra/database/repositories/album.repo";
import {TrackRepository, CreateTrackData} from "../infra/database/repositories/track.repository";

const CONCURRENT_LIMIT = 100;
export class MusicMetadataService {
    static async storeSearchResults(searchResults: QobuzSearchResults) {
        try {
            console.time("processArtist");
            for (const qobuzArtist of searchResults.artists.items) {
                try {
                    if (
                        qobuzArtist.name.toLowerCase().includes("various") &&
                        qobuzArtist.name.toLowerCase().includes("artists")
                    )
                        continue;

                    await this.processArtist(qobuzArtist);
                } catch (error) {
                    console.error(`Error processing artist: ${qobuzArtist.name} (Qobuz ID: ${qobuzArtist.id})`, error);
                }
            }
            console.timeEnd("processArtist");

            console.time("albumWholeUrl");
            const albumWholeUrlPromises = searchResults.albums.items.map((qobuzAlbum) => {
                return getAlbumInfo(qobuzAlbum.id);
            });

            const albumWholePromises = await this.getAlbumInfoInBatches(albumWholeUrlPromises, CONCURRENT_LIMIT);
            console.timeEnd("albumWholeUrl");

            console.time("processWholeAlbum");
            for (const [index, qobuzAlbum] of searchResults.albums.items.entries()) {
                try {
                    if (
                        qobuzAlbum.artist.name.toLowerCase().includes("various") &&
                        qobuzAlbum.artist.name.toLowerCase().includes("artists")
                    )
                        continue;

                    await this.processWholeAlbum(qobuzAlbum, albumWholePromises[index]);
                } catch (error) {
                    console.error(
                        `Error processing album: ${qobuzAlbum.title} (Qobuz ID: ${qobuzAlbum.qobuz_id})`,
                        error
                    );
                }
            }
            console.timeEnd("processWholeAlbum");

            await new Promise((resolve) => setTimeout(resolve, 60000));

            console.time("albumUrl");
            const albumUrlPromises = searchResults.tracks.items.map((qobuzTrack) => {
                return getAlbumInfo(qobuzTrack.album.id);
            });

            const albumPromises = await this.getAlbumInfoInBatches(albumUrlPromises, CONCURRENT_LIMIT);
            console.timeEnd("albumUrl");

            console.time("processTrack");
            for (const [index, qobuzTrack] of searchResults.tracks.items.entries()) {
                try {
                    if (
                        qobuzTrack.album.artist.name.toLowerCase().includes("various") &&
                        qobuzTrack.album.artist.name.toLowerCase().includes("artists")
                    )
                        continue;

                    const artist = await this.processArtist(qobuzTrack.album.artist);
                    const genre = await this.processGenre(qobuzTrack.album.genre);
                    const label = await this.processLabel(qobuzTrack.album.label);

                    const album = await this.processAlbum(
                        qobuzTrack.album,
                        albumPromises[index],
                        artist.rId,
                        genre.rId,
                        label.rId
                    );

                    await this.processTrack(qobuzTrack, album.rId);
                } catch (error) {
                    console.error(`Error processing track: ${qobuzTrack.title} (Qobuz ID: ${qobuzTrack.id})`, error);
                }
            }
            console.timeEnd("processTrack");
        } catch (error) {
            console.error("Error storing search results:", error);
            throw error;
        }
    }

    static async processWholeAlbum(qobuzAlbum: QobuzAlbum, albumData: any) {
        const artist = await this.processArtist(qobuzAlbum.artist);

        const genre = await this.processGenre(qobuzAlbum.genre);

        const label = await this.processLabel(qobuzAlbum.label);

        await this.processAlbum(qobuzAlbum, albumData, artist.rId, genre.rId, label.rId);
    }

    private static async processArtist(qobuzArtist: any) {
        let artist = await ArtistRepository.findByQobuzId(qobuzArtist.id);

        if (!artist) {
            const artistData: CreateArtistData = {
                name: qobuzArtist.name,
                id: qobuzArtist.id,
                albumsCount: qobuzArtist.albums_count || 0,
                image: qobuzArtist.image
            };

            artist = await ArtistRepository.create(artistData);
        } else {
            artist = await ArtistRepository.updateByQobuzId(qobuzArtist.id, {
                name: qobuzArtist.name,
                albumsCount: qobuzArtist.albums_count || artist.albumsCount,
                image: qobuzArtist.image || artist.image
            });
        }

        return artist!;
    }

    private static async processGenre(qobuzGenre: any) {
        let genre = await GenreRepository.findByQobuzId(qobuzGenre.id);

        if (!genre) {
            const genreData: CreateGenreData = {
                path: qobuzGenre.path,
                color: qobuzGenre.color,
                name: qobuzGenre.name,
                id: qobuzGenre.id
            };

            genre = await GenreRepository.create(genreData);
        } else {
            genre = await GenreRepository.updateByQobuzId(qobuzGenre.id, {
                path: qobuzGenre.path,
                color: qobuzGenre.color,
                name: qobuzGenre.name
            });
        }

        return genre!;
    }

    private static async processLabel(qobuzLabel: any) {
        let label = await LabelRepository.findByQobuzId(qobuzLabel.id);

        if (!label) {
            const labelData: CreateLabelData = {
                name: qobuzLabel.name,
                id: qobuzLabel.id,
                albumsCount: qobuzLabel.albums_count || 0
            };

            label = await LabelRepository.create(labelData);
        } else {
            label = await LabelRepository.updateByQobuzId(qobuzLabel.id, {
                name: qobuzLabel.name,
                albumsCount: qobuzLabel.albums_count || label.albumsCount
            });
        }

        return label!;
    }

    private static async processAlbum(
        qobuzAlbum: QobuzAlbum,
        albumData: any,
        artistId: string,
        genreId: string,
        labelId: string
    ) {
        let album = await AlbumRepository.findByQobuzId(qobuzAlbum.qobuz_id);

        let trackItems: any = null;
        let fullAlbumData: any = null;
        if (qobuzAlbum.url && albumData) {
            try {
                const {tracks, ...restAlbumData} = albumData;
                trackItems = tracks.items;
                fullAlbumData = restAlbumData;
            } catch (error) {
                console.error(
                    `Error getting album info: ${qobuzAlbum.title} (Qobuz ID: ${qobuzAlbum.qobuz_id})`,
                    error
                );
            }
        }

        if (!album) {
            const albumData: CreateAlbumData = {
                labelId: labelId,
                artistId: artistId,
                genreId: genreId,
                upc: qobuzAlbum.upc,
                data: fullAlbumData ?? qobuzAlbum
            };

            album = await AlbumRepository.create(albumData);
        } else {
            album = await AlbumRepository.updateByQobuzId(qobuzAlbum.qobuz_id, {
                data: fullAlbumData ?? qobuzAlbum
            });
        }

        if (trackItems) {
            for (const track of trackItems) {
                await this.processTrack(track, album!.rId);
            }
        }

        return album!;
    }

    private static async processTrack(qobuzTrack: any, albumId: string) {
        let track = await TrackRepository.findByIsrc(qobuzTrack.isrc);

        if (!track) {
            const trackData: CreateTrackData = {
                data: qobuzTrack,
                albumId: albumId,
                isrc: qobuzTrack.isrc
            };

            track = await TrackRepository.create(trackData);
        } else {
            track = await TrackRepository.updateByIsrc(qobuzTrack.isrc, {
                data: qobuzTrack
            });
        }

        return track!;
    }

    static async getAlbumInfoInBatches(items: Promise<any>[], batchSize: number) {
        let offset = 0;
        const albumInfo: any[] = [];

        while (offset < items.length) {
            const batch = items.slice(offset, offset + batchSize);
            const batchInfo = await Promise.all(batch);
            albumInfo.push(...batchInfo);
            offset += batch.length;
        }

        return albumInfo;
    }
}
