import { z } from "zod";

export const sessionInfoSchema = z.object({
    id: z.string(),
    token: z.string(),
    fingerprint: z.string(),
});
export type SessionInfo = z.infer<typeof sessionInfoSchema>;
