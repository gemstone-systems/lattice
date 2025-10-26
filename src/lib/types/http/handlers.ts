import { z } from "zod";

export const handshakeDataSchema = z.object({
    interServiceJwt: z.string(),
    channelAtUris: z.array(z.string()),
});
export type HandshakeData = z.infer<typeof handshakeDataSchema>;
