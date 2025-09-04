import {getAlbumInfo, QobuzSearchResults} from "../../lib/qobuz-dl";
import {ArtistRepository, CreateArtistData} from "../infra/database/repositories/artist.repo";
import {GenreRepository, CreateGenreData} from "../infra/database/repositories/genre.repo";
import {LabelRepository, CreateLabelData} from "../infra/database/repositories/label.repo";
import {AlbumRepository, CreateAlbumData} from "../infra/database/repositories/album.repo";
import {TrackRepository, CreateTrackData} from "../infra/database/repositories/track.repository";

export class MusicMetadataService {
    static async storeSearchResults(searchResults: QobuzSearchResults): Promise<{
        artists: number;
        genres: number;
        labels: number;
        albums: number;
        tracks: number;
    }> {
        const stats = {
            artists: 0,
            genres: 0,
            labels: 0,
            albums: 0,
            tracks: 0
        };

        try {
            console.log("Starting to process artists...");
            for (const qobuzArtist of searchResults.artists.items) {
                try {
                    console.log(`Processing artist: ${qobuzArtist.name} (Qobuz ID: ${qobuzArtist.id})`);
                    await this.processArtist(qobuzArtist);
                    stats.artists++;
                } catch (error) {
                    console.error(`Error processing artist: ${qobuzArtist.name} (Qobuz ID: ${qobuzArtist.id})`, error);
                }
            }
            console.log(`Finished processing artists. Total: ${stats.artists}`);

            console.log("Starting to process albums...");
            for (const qobuzAlbum of searchResults.albums.items) {
                try {
                    console.log(`Processing album: ${qobuzAlbum.title} (Qobuz ID: ${qobuzAlbum.qobuz_id})`);
                    const artist = await this.processArtist(qobuzAlbum.artist);

                    const genre = await this.processGenre(qobuzAlbum.genre);
                    stats.genres++;
                    console.log(`Processed genre: ${qobuzAlbum.genre?.name} (Qobuz ID: ${qobuzAlbum.genre?.id})`);

                    const label = await this.processLabel(qobuzAlbum.label);
                    stats.labels++;
                    console.log(`Processed label: ${qobuzAlbum.label?.name} (Qobuz ID: ${qobuzAlbum.label?.id})`);

                    await this.processAlbum(qobuzAlbum, artist.rId, genre.rId, label.rId);
                    stats.albums++;
                } catch (error) {
                    console.error(
                        `Error processing album: ${qobuzAlbum.title} (Qobuz ID: ${qobuzAlbum.qobuz_id})`,
                        error
                    );
                }
            }
            console.log(`Finished processing albums. Total: ${stats.albums}`);

            console.log("Starting to process standalone tracks...");
            for (const qobuzTrack of searchResults.tracks.items) {
                try {
                    console.log(`Processing track: ${qobuzTrack.title} (Qobuz ID: ${qobuzTrack.id})`);
                    const artist = await this.processArtist(qobuzTrack.album.artist);
                    const genre = await this.processGenre(qobuzTrack.album.genre);
                    const label = await this.processLabel(qobuzTrack.album.label);

                    const album = await this.processAlbum(qobuzTrack.album, artist.rId, genre.rId, label.rId);

                    await this.processTrack(qobuzTrack, album.rId);
                    stats.tracks++;
                } catch (error) {
                    console.error(`Error processing track: ${qobuzTrack.title} (Qobuz ID: ${qobuzTrack.id})`, error);
                }
            }
            console.log(`Finished processing tracks. Total: ${stats.tracks}`);

            console.log("All search results processed. Stats:", stats);
            return stats;
        } catch (error) {
            console.error("Error storing search results:", error);
            throw error;
        }
    }

    private static async processArtist(qobuzArtist: any) {
        let artist = await ArtistRepository.findByQobuzId(qobuzArtist.id);

        if (!artist) {
            console.log(
                `Artist not found in DB. Creating new artist: ${qobuzArtist.name} (Qobuz ID: ${qobuzArtist.id})`
            );
            const artistData: CreateArtistData = {
                name: qobuzArtist.name,
                id: qobuzArtist.id,
                albumsCount: qobuzArtist.albums_count || 0,
                image: qobuzArtist.image
            };

            artist = await ArtistRepository.create(artistData);
            console.log(`Artist created: ${artist.name} (rId: ${artist.rId})`);
        } else {
            console.log(`Artist already exists. Updating artist: ${qobuzArtist.name} (Qobuz ID: ${qobuzArtist.id})`);
            artist = await ArtistRepository.updateByQobuzId(qobuzArtist.id, {
                name: qobuzArtist.name,
                albumsCount: qobuzArtist.albums_count || artist.albumsCount,
                image: qobuzArtist.image || artist.image
            });
            console.log(`Artist updated: ${artist?.name} (rId: ${artist?.rId})`);
        }

        return artist!;
    }

    private static async processGenre(qobuzGenre: any) {
        let genre = await GenreRepository.findByQobuzId(qobuzGenre.id);

        if (!genre) {
            console.log(`Genre not found in DB. Creating new genre: ${qobuzGenre.name} (Qobuz ID: ${qobuzGenre.id})`);
            const genreData: CreateGenreData = {
                path: qobuzGenre.path,
                color: qobuzGenre.color,
                name: qobuzGenre.name,
                id: qobuzGenre.id
            };

            genre = await GenreRepository.create(genreData);
            console.log(`Genre created: ${genre.name} (rId: ${genre.rId})`);
        } else {
            console.log(`Genre already exists. Updating genre: ${qobuzGenre.name} (Qobuz ID: ${qobuzGenre.id})`);
            genre = await GenreRepository.updateByQobuzId(qobuzGenre.id, {
                path: qobuzGenre.path,
                color: qobuzGenre.color,
                name: qobuzGenre.name
            });
            console.log(`Genre updated: ${genre?.name} (rId: ${genre?.rId})`);
        }

        return genre!;
    }

    private static async processLabel(qobuzLabel: any) {
        let label = await LabelRepository.findByQobuzId(qobuzLabel.id);

        if (!label) {
            console.log(`Label not found in DB. Creating new label: ${qobuzLabel.name} (Qobuz ID: ${qobuzLabel.id})`);
            const labelData: CreateLabelData = {
                name: qobuzLabel.name,
                id: qobuzLabel.id,
                albumsCount: qobuzLabel.albums_count || 0
            };

            label = await LabelRepository.create(labelData);
            console.log(`Label created: ${label.name} (rId: ${label.rId})`);
        } else {
            console.log(`Label already exists. Updating label: ${qobuzLabel.name} (Qobuz ID: ${qobuzLabel.id})`);
            label = await LabelRepository.updateByQobuzId(qobuzLabel.id, {
                name: qobuzLabel.name,
                albumsCount: qobuzLabel.albums_count || label.albumsCount
            });
            console.log(`Label updated: ${label?.name} (rId: ${label?.rId})`);
        }

        return label!;
    }

    private static async processAlbum(qobuzAlbum: any, artistId: string, genreId: string, labelId: string) {
        let album = await AlbumRepository.findByQobuzId(qobuzAlbum.qobuz_id);

        let trackItems: any = null;
        let fullAlbumData: any = null;
        if (qobuzAlbum.url) {
            try {
                const {tracks, ...restAlbumData} = await getAlbumInfo(qobuzAlbum.url.split("/").pop()!);
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
            console.log(
                `Album not found in DB. Creating new album: ${qobuzAlbum.title} (Qobuz ID: ${qobuzAlbum.qobuz_id})`
            );
            const albumData: CreateAlbumData = {
                labelId: labelId,
                artistId: artistId,
                genreId: genreId,
                data: fullAlbumData ?? qobuzAlbum
            };

            album = await AlbumRepository.create(albumData);
            console.log(`Album created: ${album.data?.title} (rId: ${album.rId})`);
        } else {
            console.log(`Album already exists. Updating album: ${qobuzAlbum.title} (Qobuz ID: ${qobuzAlbum.qobuz_id})`);
            album = await AlbumRepository.updateByQobuzId(qobuzAlbum.qobuz_id, {
                data: fullAlbumData ?? qobuzAlbum
            });
            console.log(`Album updated: ${album?.data?.title} (rId: ${album?.rId})`);
        }

        if (trackItems) {
            for (const track of trackItems) {
                await this.processTrack(track, album!.rId);
            }
        }

        return album!;
    }

    private static async processTrack(qobuzTrack: any, albumId: string) {
        let track = await TrackRepository.findByQobuzId(qobuzTrack.id);

        if (!track) {
            console.log(`Track not found in DB. Creating new track: ${qobuzTrack.title} (Qobuz ID: ${qobuzTrack.id})`);
            const trackData: CreateTrackData = {
                data: qobuzTrack,
                albumId: albumId
            };

            track = await TrackRepository.create(trackData);
            console.log(`Track created: ${track.data?.title} (rId: ${track.rId})`);
        } else {
            console.log(`Track already exists. Updating track: ${qobuzTrack.title} (Qobuz ID: ${qobuzTrack.id})`);
            track = await TrackRepository.updateByQobuzId(qobuzTrack.id, {
                data: qobuzTrack
            });
            console.log(`Track updated: ${track?.data?.title} (rId: ${track?.rId})`);
        }

        return track!;
    }
}
