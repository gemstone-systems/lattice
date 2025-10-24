import { atUriSchema } from "@/lib/types/atproto";
import { z } from "zod";

export const sessionInfoSchema = z.object({
    id: z.string(),
    token: z.string(),
    fingerprint: z.string(),
    allowedChannels: z.array(atUriSchema),
});
export type SessionInfo = z.infer<typeof sessionInfoSchema>;
