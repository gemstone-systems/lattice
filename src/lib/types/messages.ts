import { didSchema } from "@/lib/types/atproto";
import { z } from "zod";

export const websocketMessageSchema = z
    .object({
        type: z.union([
            z.literal("shard/message"),
            z.literal("shard/history"),
            z.literal("shard/requestHistory"),
        ]),
    })
    .loose();
export type WebsocketMessage = z.infer<typeof websocketMessageSchema>;

export const shardMessageSchema = websocketMessageSchema
    .safeExtend({
        type: z.literal("shard/message"),
        channel: z.string(),
        content: z.string(),
        sentBy: didSchema,
        sentAt: z.coerce.date(),
    })
    .strict();
export type ShardMessage = z.infer<typeof shardMessageSchema>;

export const historyMessageSchema = websocketMessageSchema
    .safeExtend({
        type: z.literal("shard/history"),
        messages: z.optional(z.array(shardMessageSchema)),
        channel: z.string(),
    })
    .strict();
export type HistoryMessage = z.infer<typeof historyMessageSchema>;

export const requestHistoryMessageSchema = websocketMessageSchema
    .safeExtend({
        type: z.literal("shard/requestHistory"),
        channel: z.string(),
    })
    .strict();
export type RequestHistoryMessage = z.infer<typeof requestHistoryMessageSchema>;
