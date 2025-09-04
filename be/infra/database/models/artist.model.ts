import {relations} from "drizzle-orm";
import {integer, text, sqliteTable} from "drizzle-orm/sqlite-core";

import {albumModel} from "./album.model";
import {baseModel} from "./base.model";

export const artistModel = sqliteTable("artists", {
    ...baseModel("artist"),
    name: text(),
    id: integer().unique(),
    albumsCount: integer(),
    image: text({ mode: "json" }).$type<{
        small: string;
        medium: string;
        large: string;
        extralarge: string;
        mega: string;
    } | null>()
});

export const artistModelRelations = relations(artistModel, ({many}) => ({
    albums: many(albumModel)
}));
