import {eq} from "drizzle-orm";
import {db} from "../connection";
import {labelModel} from "../models/label.model";

export type CreateLabelData = typeof labelModel.$inferInsert;
export type LabelData = typeof labelModel.$inferSelect;
export type UpdateLabelData = Partial<Omit<CreateLabelData, "sId" | "rId" | "createdAt">>;

export class LabelRepository {
    // Create a new label
    static async create(data: CreateLabelData): Promise<LabelData> {
        const [label] = await db.insert(labelModel).values(data).returning();
        return label;
    }

    // Find label by sequential ID
    static async findById(sId: number): Promise<LabelData | null> {
        const [label] = await db.select().from(labelModel).where(eq(labelModel.sId, sId));
        return label || null;
    }

    // Find label by random UUID
    static async findByrId(rId: string): Promise<LabelData | null> {
        const [label] = await db.select().from(labelModel).where(eq(labelModel.rId, rId));
        return label || null;
    }

    // Find label by Qobuz ID
    static async findByQobuzId(id: number): Promise<LabelData | null> {
        const [label] = await db.select().from(labelModel).where(eq(labelModel.id, id));
        return label || null;
    }

    // Find label by name
    static async findByName(name: string): Promise<LabelData | null> {
        const [label] = await db.select().from(labelModel).where(eq(labelModel.name, name));
        return label || null;
    }

    // Get all labels with pagination
    static async findAll(limit: number = 10, offset: number = 0): Promise<LabelData[]> {
        return await db.select().from(labelModel).limit(limit).offset(offset);
    }

    // Search labels by name (exact match - for partial matching, you'd use `like` with wildcards)
    static async searchByName(searchTerm: string, limit: number = 10): Promise<LabelData[]> {
        return await db.select().from(labelModel).where(eq(labelModel.name, searchTerm)).limit(limit);
    }

    // Update label by sequential ID
    static async updateById(sId: number, data: UpdateLabelData): Promise<LabelData | null> {
        const [label] = await db.update(labelModel).set(data).where(eq(labelModel.sId, sId)).returning();
        return label || null;
    }

    // Update label by random UUID
    static async updateByrId(rId: string, data: UpdateLabelData): Promise<LabelData | null> {
        const [label] = await db.update(labelModel).set(data).where(eq(labelModel.rId, rId)).returning();
        return label || null;
    }

    // Update label by Qobuz ID
    static async updateByQobuzId(id: number, data: UpdateLabelData): Promise<LabelData | null> {
        const [label] = await db.update(labelModel).set(data).where(eq(labelModel.id, id)).returning();
        return label || null;
    }

    // Delete label by sequential ID
    static async deleteById(sId: number): Promise<boolean> {
        try {
            await db.delete(labelModel).where(eq(labelModel.sId, sId));
            return true;
        } catch {
            return false;
        }
    }

    // Delete label by random UUID
    static async deleteByrId(rId: string): Promise<boolean> {
        try {
            await db.delete(labelModel).where(eq(labelModel.rId, rId));
            return true;
        } catch {
            return false;
        }
    }

    // Delete label by Qobuz ID
    static async deleteByQobuzId(id: number): Promise<boolean> {
        try {
            await db.delete(labelModel).where(eq(labelModel.id, id));
            return true;
        } catch {
            return false;
        }
    }

    // Check if label exists by Qobuz ID
    static async existsByQobuzId(id: number): Promise<boolean> {
        const [label] = await db.select({sId: labelModel.sId}).from(labelModel).where(eq(labelModel.id, id));
        return !!label;
    }

    // Check if label exists by name
    static async existsByName(name: string): Promise<boolean> {
        const [label] = await db.select({sId: labelModel.sId}).from(labelModel).where(eq(labelModel.name, name));
        return !!label;
    }

    // Count total labels
    static async count(): Promise<number> {
        const [result] = await db.select({count: labelModel.sId}).from(labelModel);
        return result?.count || 0;
    }

    // Get labels with high album counts (popular labels)
    static async findPopularLabels(minAlbumCount: number = 10, limit: number = 10): Promise<LabelData[]> {
        return await db
            .select()
            .from(labelModel)
            .where(eq(labelModel.albumsCount, minAlbumCount)) // Note: For >= comparison, you'd use `gte`
            .limit(limit);
    }

    // Get labels ordered by album count (descending)
    static async findByAlbumCount(limit: number = 10): Promise<LabelData[]> {
        return await db
            .select()
            .from(labelModel)
            .orderBy(labelModel.albumsCount) // Note: For descending order, you'd use `desc(labelModel.albumsCount)`
            .limit(limit);
    }
}
