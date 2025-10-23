import { didSchema, nsidSchema } from "@/lib/types/atproto";
import { z } from "zod";

const prismEventSchema = z.object({
    did: didSchema,
    time_us: z.number(),
    kind: z.union([
        z.literal("commit"),
        z.literal("identity"),
        z.literal("account"),
    ]),
});

export const prismCommitSchema = prismEventSchema.safeExtend({
    commit: z.object({
        rev: z.string(),
        operation: z.union([
            z.literal("create"),
            z.literal("update"),
            z.literal("delete"),
        ]),
        collection: nsidSchema,
        rkey: z.string(),
        record: z.record(z.string(), z.unknown()),
    }),
});
export type PrismCommit = z.infer<typeof prismCommitSchema>;
