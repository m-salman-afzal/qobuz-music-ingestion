import {eq, sql} from "drizzle-orm";
import {db} from "../connection";
import {trackModel} from "../models/track.model";
import {albumModel, artistModel, genreModel} from "../models";
import {AlbumData} from "./album.repo";
import {ArtistData} from "./artist.repo";
import {GenreData} from "./genre.repo";

export type CreateTrackData = typeof trackModel.$inferInsert;
export type TrackData = typeof trackModel.$inferSelect;
export type UpdateTrackData = Partial<Omit<CreateTrackData, "sId" | "rId" | "createdAt">>;

export type TrackWithAlbumAndArtistAndGenre = {
    tracks: TrackData | null;
    albums: AlbumData | null;
    artists: ArtistData | null;
    genres: GenreData | null;
};

export class TrackRepository {
    static async create(data: CreateTrackData): Promise<TrackData> {
        const [track] = await db.insert(trackModel).values(data).returning();
        return track;
    }

    static async findById(sId: number): Promise<TrackData | null> {
        const [track] = await db.select().from(trackModel).where(eq(trackModel.sId, sId));
        return track || null;
    }

    static async findByrId(rId: string): Promise<TrackData | null> {
        const [track] = await db.select().from(trackModel).where(eq(trackModel.rId, rId));
        return track || null;
    }

    static async findByQobuzId(id: number): Promise<TrackData | null> {
        const [track] = await db
            .select()
            .from(trackModel)
            .where(sql`data->>'id' = ${id}`);
        return track || null;
    }

    static async updateById(sId: number, data: UpdateTrackData): Promise<TrackData | null> {
        const [track] = await db.update(trackModel).set(data).where(eq(trackModel.sId, sId)).returning();
        return track || null;
    }

    static async updateByrId(rId: string, data: UpdateTrackData): Promise<TrackData | null> {
        const [track] = await db.update(trackModel).set(data).where(eq(trackModel.rId, rId)).returning();
        return track || null;
    }

    static async updateByQobuzId(id: number, data: UpdateTrackData): Promise<TrackData | null> {
        const [track] = await db
            .update(trackModel)
            .set(data)
            .where(sql`data->>'id' = ${id}`)
            .returning();
        return track || null;
    }

    static async findByDownloadStatusAndDownloadUrl(
        status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED"
    ): Promise<TrackData[]> {
        return await db.select().from(trackModel).where(eq(trackModel.downloadStatus, status));
    }

    static async findPendingDownloads() {
        return await db
            .select()
            .from(trackModel)
            .leftJoin(albumModel, eq(trackModel.albumId, albumModel.rId))
            .leftJoin(artistModel, eq(albumModel.artistId, artistModel.rId))
            .leftJoin(genreModel, eq(albumModel.genreId, genreModel.rId))
            .where(eq(trackModel.downloadStatus, "PENDING"));
    }

    static async updateDownloadStatus(
        id: number,
        status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED"
    ): Promise<TrackData | null> {
        const [track] = await db
            .update(trackModel)
            .set({downloadStatus: status})
            .where(sql`data->>'id' = ${id}`)
            .returning();
        return track || null;
    }

    static async findTracksByAlbumId(albumId: string): Promise<TrackWithAlbumAndArtistAndGenre[]> {
        return await db
            .select()
            .from(trackModel)
            .leftJoin(albumModel, eq(trackModel.albumId, albumModel.rId))
            .leftJoin(artistModel, eq(albumModel.artistId, artistModel.rId))
            .leftJoin(genreModel, eq(albumModel.genreId, genreModel.rId))
            .where(eq(trackModel.albumId, albumId));
    }

    static async findTracksByAlbumRId(albumRId: string): Promise<TrackWithAlbumAndArtistAndGenre[]> {
        return await db
            .select()
            .from(trackModel)
            .leftJoin(albumModel, eq(trackModel.albumId, albumModel.rId))
            .leftJoin(artistModel, eq(albumModel.artistId, artistModel.rId))
            .leftJoin(genreModel, eq(albumModel.genreId, genreModel.rId))
            .where(eq(trackModel.albumId, albumRId));
    }

    static async findTracksByAlbumQobuzId(qobuzId: number): Promise<TrackWithAlbumAndArtistAndGenre[]> {
        return await db
            .select()
            .from(trackModel)
            .leftJoin(albumModel, eq(trackModel.albumId, albumModel.rId))
            .leftJoin(artistModel, eq(albumModel.artistId, artistModel.rId))
            .leftJoin(genreModel, eq(albumModel.genreId, genreModel.rId))
            .where(sql`albums.data->>'qobuz_id' = ${qobuzId}`);
    }
}
