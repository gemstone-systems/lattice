import { z } from "zod";

export const websocketMessageSchema = z.object({
    type: z.union([z.literal("shard/message"), z.literal("shard/history")]),
});

export type WebsocketMessage = z.infer<typeof websocketMessageSchema>;

export const shardMessageSchema = websocketMessageSchema.extend({
    type: z.literal("shard/message"),
    text: z.string(),
    timestamp: z.coerce.date(),
});

export type ShardMessage = z.infer<typeof shardMessageSchema>;

export const historyMessageSchema = websocketMessageSchema.extend({
    type: z.literal("shard/history"),
    messages: z.optional(z.array(shardMessageSchema)),
});

export type HistoryMessage = z.infer<typeof historyMessageSchema>;
