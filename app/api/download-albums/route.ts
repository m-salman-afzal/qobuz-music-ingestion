import {NextResponse} from "next/server";
import {AlbumDownloadService} from "@/be/services/albumDownload.service";
import {GLOBAL_CONSTANTS} from "@/be/constants/global.constant";

export async function POST(request: Request) {
    if (GLOBAL_CONSTANTS.IS_ALBUMS_PROCESSING || GLOBAL_CONSTANTS.IS_METADATA_PROCESSING) {
        return new NextResponse(
            JSON.stringify({
                success: false,
                error: "Albums processing is already in progress"
            }),
            {status: 400}
        );
    }

    GLOBAL_CONSTANTS.IS_ALBUMS_PROCESSING = true;

    try {
        const {albumCountToDownload} = await request.json();

        // Start the album download process in the background, don't await it
        AlbumDownloadService.processPendingAlbumDownloads(albumCountToDownload).catch((error: any) => {
            // Optionally log the error or handle it as needed
            console.error("Background album download error:", error);
            GLOBAL_CONSTANTS.IS_ALBUMS_PROCESSING = false;
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
        GLOBAL_CONSTANTS.IS_ALBUMS_PROCESSING = false;
        return new NextResponse(
            JSON.stringify({
                success: false,
                error: error?.errors || error.message || "An error occurred processing album downloads."
            }),
            {status: 500}
        );
    }
}
