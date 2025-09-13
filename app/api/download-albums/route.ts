import {NextResponse} from "next/server";
import {AlbumDownloadService} from "@/be/services/albumDownload.service";
import {ConfigService} from "@/be/services/config.service";

export async function POST(request: Request) {
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
    if (config.data.isAlbumsProcessing || config.data.isMetadataProcessing) {
        return new NextResponse(
            JSON.stringify({
                success: false,
                error: "Albums processing is already in progress"
            }),
            {status: 400}
        );
    }

    config.data.isAlbumsProcessing = true;
    await ConfigService.updateConfig(config);

    try {
        const {albumCountToDownload} = await request.json();

        // Start the album download process in the background, don't await it
        AlbumDownloadService.processPendingAlbumDownloads(albumCountToDownload).catch(async (error: any) => {
            // Optionally log the error or handle it as needed
            console.error("Background album download error:", error);
            config.data!.isAlbumsProcessing = false;
            await ConfigService.updateConfig(config);
        });

        return new NextResponse(
            JSON.stringify({
                success: true,
                data: {
                    message: "Album download processing started in the background"
                }
            }),
            {status: 200}
        );
    } catch (error: any) {
        config.data.isAlbumsProcessing = false;
        await ConfigService.updateConfig(config);
        return new NextResponse(
            JSON.stringify({
                success: false,
                error: error?.errors || error.message || "An error occurred processing album downloads."
            }),
            {status: 500}
        );
    }
}
