import {relations} from "drizzle-orm";
import {integer, text, sqliteTable} from "drizzle-orm/sqlite-core";

import {albumModel} from "./album.model";
import {baseModel} from "./base.model";

export const labelModel = sqliteTable("labels", {
    ...baseModel("label"),
    name: text(),
    id: integer().notNull().unique(),
    albumsCount: integer()
});

export const labelModelRelations = relations(labelModel, ({many}) => ({
    albums: many(albumModel)
}));
