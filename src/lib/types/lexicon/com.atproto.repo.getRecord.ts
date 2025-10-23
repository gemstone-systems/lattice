import { z } from "zod";

export const comAtprotoRepoGetRecordResponseSchema = z.object({
    uri: z.string(),
    cid: z.optional(z.string()),
    value: z
        .object({
            $type: z.string(),
        })
        .catchall(z.unknown()),
});
export type ComAtprotoRepoGetRecordResponse = z.infer<
    typeof comAtprotoRepoGetRecordResponseSchema
>;
