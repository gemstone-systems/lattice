import {
    latticeSessionInfoSchema,
    shardSessionInfoSchema,
} from "@/lib/types/handshake";
import { httpResponseErrorInfoSchema } from "@/lib/types/http/errors";
import { z } from "zod";

export const HttpResponseStatusType = {
    SUCCESS: "success",
    ERROR: "error",
} as const;
export const httpResponseStatusTypeSchema = z.enum(HttpResponseStatusType);
export type HttpResponseStatusType = z.infer<
    typeof httpResponseStatusTypeSchema
>;

export const latticeHandshakeResponseSchema = z.object({
    sessionInfo: latticeSessionInfoSchema,
});
export type LatticeHandshakeResponse = z.infer<
    typeof latticeHandshakeResponseSchema
>;

export const shardHandshakeResponseSchema = z.object({
    sessionInfo: shardSessionInfoSchema,
});
export type ShardHandshakeResponse = z.infer<
    typeof shardHandshakeResponseSchema
>;

export const httpResponseDataSchema = z.union([
    latticeHandshakeResponseSchema,
    shardHandshakeResponseSchema,
]);
export type HttpResponseData = z.infer<typeof httpResponseDataSchema>;

const httpResponseBaseSchema = z.object({
    status: httpResponseStatusTypeSchema,
    data: z.optional(httpResponseDataSchema),
    error: z.optional(httpResponseErrorInfoSchema),
});

export const httpSuccessResponseSchema = httpResponseBaseSchema
    .safeExtend({
        status: z.literal(HttpResponseStatusType.SUCCESS),
        data: httpResponseDataSchema,
        error: z.undefined(),
    })
    .omit({ error: true });
export type HttpSuccessResponse = z.infer<typeof httpSuccessResponseSchema>;

export const httpErrorResponseSchema = httpResponseBaseSchema
    .safeExtend({
        status: z.literal(HttpResponseStatusType.ERROR),
        error: httpResponseErrorInfoSchema,
        data: z.undefined(),
    })
    .omit({ data: true });
export type HttpErrorResponse = z.infer<typeof httpErrorResponseSchema>;
