import {getDownloadURL} from "@/lib/qobuz-dl";
import {TrackRepository} from "../infra/database/repositories/track.repository";
import z from "zod";

const downloadParamsSchema = z.object({
    track_id: z.preprocess((a) => parseInt(a as string), z.number().min(0, "ID must be 0 or greater").default(1)),
    quality: z.enum(["27", "7", "6", "5"]).default("27")
});

export type DownloadMusicParams = {
    track_id: number;
    quality: "27" | "7" | "6" | "5";
};

export type DownloadMusicResult = {
    success: boolean;
    data?: {
        url: string;
    };
    error?: string;
};

export class MusicUrlService {
    static async getDownloadUrl(params: DownloadMusicParams): Promise<DownloadMusicResult> {
        try {
            const {track_id, quality} = downloadParamsSchema.parse(params);

            const url = await getDownloadURL(track_id, quality);

            if (!url) {
                console.error(
                    `[getDownloadUrl] Failed to retrieve download URL from Qobuz for track_id ${track_id}, quality ${quality}`
                );
                return {
                    success: false,
                    error: "Failed to retrieve download URL from Qobuz"
                };
            }

            return {
                success: true,
                data: {url}
            };
        } catch (error: any) {
            console.error("[getDownloadUrl] Error occurred:", error);
            return {
                success: false,
                error: error?.errors || error.message || "An error occurred processing the download request."
            };
        }
    }

    static async findByDownloadStatusAndDownloadUrl() {
        const tracks = await TrackRepository.findByDownloadStatusAndDownloadUrl("PENDING");
        for (const track of tracks) {
            await this.getDownloadUrl({track_id: track.data?.id ?? 0, quality: "27"});
        }

        return tracks;
    }
}
