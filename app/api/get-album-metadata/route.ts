import {NextRequest, NextResponse} from "next/server";
import {MusicMetadataService} from "@/be/services/musicMetadata.service";
// import {getAlbumInfo} from "@/lib/qobuz-dl";

export async function POST(request: NextRequest) {
    try {
        const {album} = await request.json();

        // const albumInfo = await getAlbumInfo(album.id);

        MusicMetadataService.processWholeAlbum({
            qobuzAlbum: album
            // albumData: albumInfo
        }).catch((error: any) => {
            console.error("Error processing album metadata:", error);
        });

        return new NextResponse(
            JSON.stringify({
                success: true,
                data: {
                    message: "Search results stored successfully"
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
