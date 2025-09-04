import {NextResponse} from "next/server";
import {AlbumDownloadService} from "@/be/services/albumDownload.service";

export async function POST(request: Request) {
    try {
        const {albumCountToDownload} = await request.json();

        // Start the album download process in the background, don't await it
        AlbumDownloadService.processPendingAlbumDownloads(albumCountToDownload).catch((error: any) => {
            // Optionally log the error or handle it as needed
            console.error("Background album download error:", error);
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
        return new NextResponse(
            JSON.stringify({
                success: false,
                error: error?.errors || error.message || "An error occurred processing album downloads."
            }),
            {status: 500}
        );
    }
}
