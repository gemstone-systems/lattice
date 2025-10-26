import { comAtprotoRepoStrongRefSchema, didSchema } from "@/lib/types/atproto";
import { z } from "zod";

export const systemsGmstnDevelopmentChannelInviteRecordSchema = z.object({
    $type: z.string(),
    channel: comAtprotoRepoStrongRefSchema,
    recipient: didSchema,
    createdAt: z.coerce.date(),
});
export type SystemsGmstnDevelopmentChannelInvite = z.infer<
    typeof systemsGmstnDevelopmentChannelInviteRecordSchema
>;
