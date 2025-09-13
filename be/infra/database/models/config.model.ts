import {sqliteTable, text} from "drizzle-orm/sqlite-core";

import {baseModel} from "./base.model";

export const configModel = sqliteTable("config", {
    ...baseModel("config"),
    data: text({mode: "json"}).$type<{
        isMetadataProcessing: boolean;
        isAlbumsProcessing: boolean;
        isAlbumProcessing: boolean;
        concurrentLimit: number;
    }>()
});
