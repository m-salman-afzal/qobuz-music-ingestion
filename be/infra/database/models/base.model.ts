import {integer, text} from "drizzle-orm/sqlite-core";
// import {sql} from "drizzle-orm";
import {v7 as uuidv7} from "uuid";

export const baseModel = (modelName: string) => ({
    sId: integer().primaryKey({autoIncrement: true}),
    rId: text()
        .unique(`${modelName}_rId_unique`)
        .notNull()
        .$defaultFn(() => uuidv7())
    // createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull()
    // updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
    // deletedAt: integer("deletedAt", { mode: "timestamp" })
});
