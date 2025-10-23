import { didSchema, nsidSchema } from "@/lib/types/atproto";
import { z } from "zod";

export const constellationBacklinkSchema = z.object({
    did: didSchema,
    collection: nsidSchema,
    rkey: z.string(),
});
export type ConstellationBacklink = z.infer<typeof constellationBacklinkSchema>;

export const constellationBacklinkResponseSchema = z.object({
    total: z.number(),
    records: z.array(constellationBacklinkSchema),
    cursor: z.optional(z.string().nullish()),
});
export type ConstellationBacklinkResponse = z.infer<
    typeof constellationBacklinkResponseSchema
>;
