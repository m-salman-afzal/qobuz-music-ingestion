import {eq} from "drizzle-orm";
import {db} from "../connection";
import {configModel} from "../models/config.model";

export type ConfigData = typeof configModel.$inferSelect;
export type CreateConfigData = typeof configModel.$inferInsert;

export class ConfigRepository {
    static async getConfig() {
        const status = await db.select().from(configModel);
        return status;
    }

    static async updateConfig(config: ConfigData) {
        const updatedStatus = await db.update(configModel).set(config).where(eq(configModel.rId, config.rId));
        return updatedStatus;
    }
}
