import {eq} from "drizzle-orm";
import {db} from "../connection";
import {genreModel} from "../models/genre.model";

export type CreateGenreData = typeof genreModel.$inferInsert;
export type GenreData = typeof genreModel.$inferSelect;
export type UpdateGenreData = Partial<Omit<CreateGenreData, "sId" | "rId" | "createdAt">>;

export class GenreRepository {
    // Create a new genre
    static async create(data: CreateGenreData): Promise<GenreData> {
        const [genre] = await db.insert(genreModel).values(data).returning();
        return genre;
    }

    // Find genre by sequential ID
    static async findById(sId: number): Promise<GenreData | null> {
        const [genre] = await db.select().from(genreModel).where(eq(genreModel.sId, sId));
        return genre || null;
    }

    // Find genre by random UUID
    static async findByrId(rId: string): Promise<GenreData | null> {
        const [genre] = await db.select().from(genreModel).where(eq(genreModel.rId, rId));
        return genre || null;
    }

    // Find genre by Qobuz ID
    static async findByQobuzId(id: number): Promise<GenreData | null> {
        const [genre] = await db.select().from(genreModel).where(eq(genreModel.id, id));
        return genre || null;
    }

    // Find genre by name
    static async findByName(name: string): Promise<GenreData | null> {
        const [genre] = await db.select().from(genreModel).where(eq(genreModel.name, name));
        return genre || null;
    }

    // Find genre by color
    static async findByColor(color: string): Promise<GenreData | null> {
        const [genre] = await db.select().from(genreModel).where(eq(genreModel.color, color));
        return genre || null;
    }

    // Get all genres with pagination
    static async findAll(limit: number = 10, offset: number = 0): Promise<GenreData[]> {
        return await db.select().from(genreModel).limit(limit).offset(offset);
    }

    // Search genres by name (exact match - for partial matching, you'd use `like` with wildcards)
    static async searchByName(searchTerm: string, limit: number = 10): Promise<GenreData[]> {
        return await db.select().from(genreModel).where(eq(genreModel.name, searchTerm)).limit(limit);
    }

    // Find genres by path (exact path match)
    static async findByPath(path: number[]): Promise<GenreData[]> {
        return await db.select().from(genreModel).where(eq(genreModel.path, path));
    }

    // Update genre by sequential ID
    static async updateById(sId: number, data: UpdateGenreData): Promise<GenreData | null> {
        const [genre] = await db.update(genreModel).set(data).where(eq(genreModel.sId, sId)).returning();
        return genre || null;
    }

    // Update genre by random UUID
    static async updateByrId(rId: string, data: UpdateGenreData): Promise<GenreData | null> {
        const [genre] = await db.update(genreModel).set(data).where(eq(genreModel.rId, rId)).returning();
        return genre || null;
    }

    // Update genre by Qobuz ID
    static async updateByQobuzId(id: number, data: UpdateGenreData): Promise<GenreData | null> {
        const [genre] = await db.update(genreModel).set(data).where(eq(genreModel.id, id)).returning();
        return genre || null;
    }

    // Delete genre by sequential ID
    static async deleteById(sId: number): Promise<boolean> {
        try {
            await db.delete(genreModel).where(eq(genreModel.sId, sId));
            return true;
        } catch {
            return false;
        }
    }

    // Delete genre by random UUID
    static async deleteByrId(rId: string): Promise<boolean> {
        try {
            await db.delete(genreModel).where(eq(genreModel.rId, rId));
            return true;
        } catch {
            return false;
        }
    }

    // Delete genre by Qobuz ID
    static async deleteByQobuzId(id: number): Promise<boolean> {
        try {
            await db.delete(genreModel).where(eq(genreModel.id, id));
            return true;
        } catch {
            return false;
        }
    }

    // Check if genre exists by Qobuz ID
    static async existsByQobuzId(id: number): Promise<boolean> {
        const [genre] = await db.select({sId: genreModel.sId}).from(genreModel).where(eq(genreModel.id, id));
        return !!genre;
    }

    // Check if genre exists by name
    static async existsByName(name: string): Promise<boolean> {
        const [genre] = await db.select({sId: genreModel.sId}).from(genreModel).where(eq(genreModel.name, name));
        return !!genre;
    }

    // Count total genres
    static async count(): Promise<number> {
        const [result] = await db.select({count: genreModel.sId}).from(genreModel);
        return result?.count || 0;
    }

    // Get all unique colors
    static async getAllColors(): Promise<string[]> {
        const results = await db.selectDistinct({color: genreModel.color}).from(genreModel);
        return results.map((r) => r.color).filter((color): color is string => color !== null);
    }
}
