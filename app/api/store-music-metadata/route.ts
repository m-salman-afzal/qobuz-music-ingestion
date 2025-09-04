import {NextRequest, NextResponse} from "next/server";
import {search} from "@/lib/qobuz-dl";
import {MusicMetadataService} from "@/be/services/musicMetadata.service";
import z from "zod";

const searchParamsSchema = z.object({
    q: z.string().min(1, "Query is required")
});

const FETCH_LIMIT = 500;

export async function POST(request: NextRequest) {
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    try {
        const {q} = searchParamsSchema.parse(params);
        let isAlbumItemFinished = false;
        let offset = 0;
        const totalStats = {
            artists: 0,
            genres: 0,
            labels: 0,
            albums: 0,
            tracks: 0
        };

        while (!isAlbumItemFinished) {
            const searchResults = await search(q, FETCH_LIMIT, offset);
            if (searchResults.albums.items.length === 0) {
                isAlbumItemFinished = true;
                break;
            }

            // Store the search results in the database
            const stats = await MusicMetadataService.storeSearchResults(searchResults);

            // Accumulate stats
            totalStats.artists += stats.artists;
            totalStats.genres += stats.genres;
            totalStats.labels += stats.labels;
            totalStats.albums += stats.albums;
            totalStats.tracks += stats.tracks;

            offset = searchResults.albums.offset + FETCH_LIMIT;
        }

        return new NextResponse(
            JSON.stringify({
                success: true,
                data: {
                    message: "Search results stored successfully",
                    stats: totalStats
                }
            }),
            {status: 200}
        );
    } catch (error: any) {
        console.error("Error storing music metadata:", error);
        return new NextResponse(
            JSON.stringify({
                success: false,
                error: error?.errors || error.message || "An error occurred processing the request."
            }),
            {status: 500}
        );
    }
}
