import {relations} from "drizzle-orm";
import {text, sqliteTable} from "drizzle-orm/sqlite-core";

import {albumModel} from "./album.model";
import {baseModel} from "./base.model";

export const trackModel = sqliteTable("tracks", {
    ...baseModel("track"),
    albumId: text().references(() => albumModel.rId),
    uploadStatus: text().default("PENDING").$type<"PENDING" | "PROCESSING" | "SUCCESS" | "FAILED">(),
    downloadStatus: text().default("PENDING").$type<"PENDING" | "PROCESSING" | "SUCCESS" | "FAILED">(),
    isrc: text(),
    folderPath: text(),
    data: text({mode: "json"}).$type<{
        audio_info?: {
            replaygain_track_gain?: number;
            replaygain_track_peak: string;
        };
        copyright?: string;
        displayable?: boolean;
        downloadable?: boolean;
        duration?: number;
        hires?: boolean;
        hires_streamable?: boolean;
        id?: number;
        isrc?: string;
        maximum_bit_depth?: number;
        maximum_channel_count?: number;
        maximum_sampling_rate?: string;
        media_number?: number;
        parental_warning?: number;
        performer?: {
            name: string;
            id: string;
        };
        performers?: string;
        previewable?: boolean;
        purchasable?: boolean;
        purchasable_at?: string;
        release_date_download?: string;
        release_date_original?: string;
        release_date_purchase?: string;
        release_date_stream?: string;
        sampleable?: boolean;
        streamable?: number;
        streamable_at?: string;
        title?: string;
        track_number?: number;
        version?: string;
        composer?: {
            name: string;
            id: number;
        } | null;
        released_at?: number;
        work?: any;
    }>()
});

export const trackModelRelations = relations(trackModel, ({one}) => ({
    album: one(albumModel, {
        fields: [trackModel.albumId],
        references: [albumModel.rId]
    })
}));
