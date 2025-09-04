import { NextResponse } from "next/server";
import { MusicDownloadService } from "@/be/services/musicDownload.service";

export async function POST() {
    try {
        const result = await MusicDownloadService.processPendingDownloads();
        
        return new NextResponse(JSON.stringify({ 
            success: true, 
            data: {
                message: "Download processing completed",
                ...result
            }
        }), { status: 200 });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ 
            success: false, 
            error: error?.errors || error.message || "An error occurred processing downloads." 
        }), { status: 500 });
    }
}