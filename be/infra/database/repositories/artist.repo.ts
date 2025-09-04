import {eq} from "drizzle-orm";
import {db} from "../connection";
import {artistModel} from "../models/artist.model";

export type CreateArtistData = typeof artistModel.$inferInsert;
export type ArtistData = typeof artistModel.$inferSelect;
export type UpdateArtistData = Partial<Omit<CreateArtistData, "sId" | "rId" | "createdAt">>;

export class ArtistRepository {
    // Create a new artist
    static async create(data: CreateArtistData): Promise<ArtistData> {
        const [artist] = await db.insert(artistModel).values(data).returning();
        return artist;
    }

    // Find artist by sequential ID
    static async findById(sId: number): Promise<ArtistData | null> {
        const [artist] = await db.select().from(artistModel).where(eq(artistModel.sId, sId));
        return artist || null;
    }

    // Find artist by random UUID
    static async findByrId(rId: string): Promise<ArtistData | null> {
        const [artist] = await db.select().from(artistModel).where(eq(artistModel.rId, rId));
        return artist || null;
    }

    // Find artist by Qobuz ID
    static async findByQobuzId(id: number): Promise<ArtistData | null> {
        const [artist] = await db.select().from(artistModel).where(eq(artistModel.id, id));
        return artist || null;
    }

    // Find artist by name
    static async findByName(name: string): Promise<ArtistData | null> {
        const [artist] = await db.select().from(artistModel).where(eq(artistModel.name, name));
        return artist || null;
    }

    // Get all artists with pagination
    static async findAll(limit: number = 10, offset: number = 0): Promise<ArtistData[]> {
        return await db.select().from(artistModel).limit(limit).offset(offset);
    }

    // Search artists by name (partial match)
    static async searchByName(searchTerm: string, limit: number = 10): Promise<ArtistData[]> {
        return await db
            .select()
            .from(artistModel)
            .where(eq(artistModel.name, searchTerm)) // Note: For partial matching, you'd use `like` with wildcards
            .limit(limit);
    }

    // Update artist by sequential ID
    static async updateById(sId: number, data: UpdateArtistData): Promise<ArtistData | null> {
        const [artist] = await db.update(artistModel).set(data).where(eq(artistModel.sId, sId)).returning();
        return artist || null;
    }

    // Update artist by random UUID
    static async updateByrId(rId: string, data: UpdateArtistData): Promise<ArtistData | null> {
        const [artist] = await db.update(artistModel).set(data).where(eq(artistModel.rId, rId)).returning();
        return artist || null;
    }

    // Update artist by Qobuz ID
    static async updateByQobuzId(id: number, data: UpdateArtistData): Promise<ArtistData | null> {
        const [artist] = await db.update(artistModel).set(data).where(eq(artistModel.id, id)).returning();
        return artist || null;
    }

    // Delete artist by sequential ID
    static async deleteById(sId: number): Promise<boolean> {
        try {
            await db.delete(artistModel).where(eq(artistModel.sId, sId));
            return true;
        } catch {
            return false;
        }
    }

    // Delete artist by random UUID
    static async deleteByrId(rId: string): Promise<boolean> {
        try {
            await db.delete(artistModel).where(eq(artistModel.rId, rId));
            return true;
        } catch {
            return false;
        }
    }

    // Delete artist by Qobuz ID
    static async deleteByQobuzId(id: number): Promise<boolean> {
        try {
            await db.delete(artistModel).where(eq(artistModel.id, id));
            return true;
        } catch {
            return false;
        }
    }

    // Check if artist exists by Qobuz ID
    static async existsByQobuzId(id: number): Promise<boolean> {
        const [artist] = await db.select({sId: artistModel.sId}).from(artistModel).where(eq(artistModel.id, id));
        return !!artist;
    }

    // Check if artist exists by name
    static async existsByName(name: string): Promise<boolean> {
        const [artist] = await db.select({sId: artistModel.sId}).from(artistModel).where(eq(artistModel.name, name));
        return !!artist;
    }

    // Count total artists
    static async count(): Promise<number> {
        const [result] = await db.select({count: artistModel.sId}).from(artistModel);
        return result?.count || 0;
    }

    // Get artists with high album counts (popular artists)
    static async findPopularArtists(minAlbumCount: number = 5, limit: number = 10): Promise<ArtistData[]> {
        return await db
            .select()
            .from(artistModel)
            .where(eq(artistModel.albumsCount, minAlbumCount)) // Note: For >= comparison, you'd use `gte`
            .limit(limit);
    }
}
