import {relations} from "drizzle-orm";
import {integer, text, sqliteTable} from "drizzle-orm/sqlite-core";

import {albumModel} from "./album.model";
import {baseModel} from "./base.model";

export const genreModel = sqliteTable("genres", {
    ...baseModel("genre"),
    path: text({ mode: "json" }).$type<number[]>(),
    color: text(),
    name: text(),
    id: integer().notNull().unique()
});

export const genreModelRelations = relations(genreModel, ({many}) => ({
    albums: many(albumModel)
}));
