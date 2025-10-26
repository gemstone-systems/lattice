import { comAtprotoRepoStrongRefSchema } from "@/lib/types/atproto";
import { z } from "zod";

export const systemsGmstnDevelopmentChannelMembershipRecordSchema = z.object({
    $type: z.string(),
    state: z.union([
        z.literal("accepted"),
        z.literal("rejected"),
        z.literal("left"),
    ]),
    invite: comAtprotoRepoStrongRefSchema,
    channel: comAtprotoRepoStrongRefSchema,
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});

export type SystemsGmstnDevelopmentChannelMembership = z.infer<
    typeof systemsGmstnDevelopmentChannelMembershipRecordSchema
>;
