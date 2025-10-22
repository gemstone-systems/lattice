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

export const handshakeResponseSchema = z.object({
    sessionInfo: z.unknown(),
});
export type HandshakeResponse = z.infer<typeof handshakeResponseSchema>;

export const httpResponseDataSchema = z.union([handshakeResponseSchema]);
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
