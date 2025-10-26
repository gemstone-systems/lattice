import { atUriSchema } from "@/lib/types/atproto";
import { z } from "zod";

export const shardSessionInfoSchema = z.object({
    id: z.string(),
    token: z.string(),
    fingerprint: z.string(),
    allowedChannels: z.array(atUriSchema),
});
export type ShardSessionInfo = z.infer<typeof shardSessionInfoSchema>;
