import {NextRequest, NextResponse} from "next/server";
import {search} from "@/lib/qobuz-dl";
import {MusicMetadataService} from "@/be/services/musicMetadata.service";
import z from "zod";
import {ConfigService} from "@/be/services/config.service";

const searchParamsSchema = z.object({
    q: z.string().min(1, "Query is required")
});

const FETCH_LIMIT = 500;

export async function POST(request: NextRequest) {
    const [config] = await ConfigService.getConfig();
    if (!config.data) {
        return new NextResponse(
            JSON.stringify({
                success: false,
                error: "Config not found"
            }),
            {status: 400}
        );
    }

    if (config.data.isMetadataProcessing || config.data.isAlbumsProcessing) {
        return new NextResponse(
            JSON.stringify({
                success: false,
                error: "Metadata processing is already in progress"
            }),
            {status: 400}
        );
    }

    config.data.isMetadataProcessing = true;
    await ConfigService.updateConfig(config);

    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    try {
        const {q} = searchParamsSchema.parse(params);

        // Start the background processing, but don't await it
        (async () => {
            let isAlbumItemFinished = false;
            let offset = 0;

            while (!isAlbumItemFinished) {
                try {
                    const searchResults = await search(q, FETCH_LIMIT, offset);
                    if (searchResults.albums.items.length === 0) {
                        isAlbumItemFinished = true;
                        config.data!.isMetadataProcessing = false;
                        await ConfigService.updateConfig(config);
                        break;
                    }

                    await MusicMetadataService.storeSearchResults(searchResults, config);

                    offset = searchResults.albums.offset + FETCH_LIMIT;
                } catch (error) {
                    console.error("Error in background music metadata processing:", error);
                    config.data!.isMetadataProcessing = false;
                    await ConfigService.updateConfig(config);
                    break;
                }
            }
        })();

        return new NextResponse(
            JSON.stringify({
                success: true,
                data: {
                    message: "Search results storing started"
                }
            }),
            {status: 200}
        );
    } catch (error: any) {
        console.error("Error storing music metadata:", error);
        config.data.isMetadataProcessing = false;
        await ConfigService.updateConfig(config);
        return new NextResponse(
            JSON.stringify({
                success: false,
                error: error?.errors || error.message || "An error occurred processing the request."
            }),
            {status: 500}
        );
    }
}
