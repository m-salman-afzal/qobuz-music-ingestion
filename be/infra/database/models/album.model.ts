import {relations} from "drizzle-orm";
import {text, sqliteTable} from "drizzle-orm/sqlite-core";

import {artistModel} from "./artist.model";
import {baseModel} from "./base.model";
import {genreModel} from "./genre.model";
import {labelModel} from "./label.model";
import {trackModel} from "./track.model";

export const albumModel = sqliteTable("albums", {
    ...baseModel("album"),
    artistId: text().references(() => artistModel.rId),
    labelId: text().references(() => labelModel.rId),
    genreId: text().references(() => genreModel.rId),
    uploadStatus: text().default("PENDING").$type<"PENDING" | "PROCESSING" | "SUCCESS" | "FAILED">(),
    downloadStatus: text().default("PENDING").$type<"PENDING" | "PROCESSING" | "SUCCESS" | "FAILED">(),
    data: text({mode: "json"}).$type<{
        title?: string;
        version?: string;
        duration?: number;
        id?: string;
        qobuz_id?: string;
        qobuzStringId?: string;
        upc?: string;
        url?: string;

        maximum_bit_depth?: string;
        maximum_sampling_rate?: string;
        maximum_channel_count?: string;
        maximum_technical_specifications?: string;

        image?: {
            small?: string;
            thumbnail?: string;
            large?: string;
            back?: string;
        };

        artists?: {
            id: string;
            name: string;
            roles: string[];
        }[];

        genres_list?: string[];

        released_at?: string;
        release_date_original?: string;
        release_date_download?: string;
        release_date_stream?: string;
        created_at?: string;

        tracks_count?: number;
        media_count?: number;
        popularity?: number;

        parental_warning?: boolean;
        hires?: boolean;
        hires_streamable?: boolean;
        streamable?: boolean;
        purchasable?: boolean;
        previewable?: boolean;
        sampleable?: boolean;
        downloadable?: boolean;
        displayable?: boolean;
        is_official?: boolean;

        purchasable_at?: string;
        streamable_at?: string;

        catchline?: string;
        copyright?: string;
        description?: string;
        description_language?: string;
        period?: string;
        product_type?: string;
        product_url?: string;
        recording_information?: string;
        relative_url?: string;
        release_type?: string;
        slug?: string;
        subtitle?: string;

        release_tags?: string[];
        track_ids?: string[];
        articles?: any[];
        awards?: {
            name: string;
            slug: string;
            award_slug: string;
            awarded_at: string;
            award_id: string;
            publication_id: string;
            publication_name: string;
            publication_slug: string;
        }[];
        goodies?: any[];

        product_sales_factors_monthly?: number;
        product_sales_factors_weekly?: number;
        product_sales_factors_yearly?: number;

        composer?: {
            id: string;
            name: string;
            slug: string;
            albums_count: number;
        };

        area?: string;
    }>()
});

export const albumModelRelations = relations(albumModel, ({one, many}) => ({
    artist: one(artistModel, {
        fields: [albumModel.artistId],
        references: [artistModel.rId]
    }),
    label: one(labelModel, {
        fields: [albumModel.labelId],
        references: [labelModel.rId]
    }),
    genre: one(genreModel, {
        fields: [albumModel.genreId],
        references: [genreModel.rId]
    }),
    tracks: many(trackModel)
}));
