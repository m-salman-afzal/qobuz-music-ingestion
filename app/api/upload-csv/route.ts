import {NextRequest, NextResponse} from "next/server";
import {parse} from "csv-parse/sync";
import {ConfigService} from "@/be/services/config.service";
import {MusicMetadataService} from "@/be/services/musicMetadata.service";
import {search} from "@/lib/qobuz-dl";

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

    try {
        const formData = await request.formData();
        const file = formData.get("csvFile") as File;

        if (!file) {
            return new NextResponse(
                JSON.stringify({
                    success: false,
                    error: "No CSV file provided"
                }),
                {status: 400}
            );
        }

        // Validate file type
        if (!file.name.toLowerCase().endsWith(".csv")) {
            return new NextResponse(
                JSON.stringify({
                    success: false,
                    error: "File must be a CSV file"
                }),
                {status: 400}
            );
        }

        // Read and parse CSV
        const csvContent = await file.text();
        const records = parse<{suggestedSearch: string}>(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        // Validate that suggestedSearch column exists
        if (!records.length || !("suggestedSearch" in records[0])) {
            return new NextResponse(
                JSON.stringify({
                    success: false,
                    error: "CSV must contain a 'suggestedSearch' column"
                }),
                {status: 400}
            );
        }

        // Extract search queries
        const searchQueries = records
            .map((record) => record.suggestedSearch)
            .filter((query) => query && query.trim().length > 0);

        if (searchQueries.length === 0) {
            return new NextResponse(
                JSON.stringify({
                    success: false,
                    error: "No valid search queries found in the CSV"
                }),
                {status: 400}
            );
        }

        // Set processing flag
        config.data.isMetadataProcessing = true;
        await ConfigService.updateConfig(config);

        // Start background processing for all queries
        (async () => {
            try {
                for (const query of searchQueries) {
                    console.log(`Processing CSV search query: ${query}`);

                    let isAlbumItemFinished = false;
                    let offset = 0;

                    while (!isAlbumItemFinished) {
                        try {
                            const searchResults = await search(query, FETCH_LIMIT, offset);
                            if (searchResults.albums.items.length === 0) {
                                isAlbumItemFinished = true;
                                break;
                            }

                            await MusicMetadataService.storeSearchResults(searchResults, config);
                            offset = searchResults.albums.offset + FETCH_LIMIT;
                        } catch (error) {
                            console.error(`Error processing query "${query}":`, error);
                            break;
                        }
                    }
                }
            } catch (error) {
                console.error("Error in CSV processing:", error);
            } finally {
                // Reset processing flag
                config.data!.isMetadataProcessing = false;
                await ConfigService.updateConfig(config);
            }
        })();

        return new NextResponse(
            JSON.stringify({
                success: true,
                data: {
                    message: `CSV processing started for ${searchQueries.length} search queries`,
                    queryCount: searchQueries.length,
                    queries: searchQueries
                }
            }),
            {status: 200}
        );
    } catch (error: any) {
        console.error("Error processing CSV upload:", error);

        // Reset processing flag on error
        if (config.data) {
            config.data.isMetadataProcessing = false;
            await ConfigService.updateConfig(config);
        }

        return new NextResponse(
            JSON.stringify({
                success: false,
                error: error?.message || "An error occurred processing the CSV file."
            }),
            {status: 500}
        );
    }
}
