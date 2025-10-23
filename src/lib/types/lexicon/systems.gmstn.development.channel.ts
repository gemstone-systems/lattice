import { comAtprotoRepoStrongRefSchema } from "@/lib/types/atproto";
import { z } from "zod";

export const systemsGmstnDevelopmentChannelRecordSchema = z.object({
    $type: z.string(),
    name: z.string(),
    topic: z.string(),
    storeAt: comAtprotoRepoStrongRefSchema,
    routeThrough: comAtprotoRepoStrongRefSchema,
    createdAt: z.coerce.date(),
});
export type SystemsGmstnDevelopmentChannel = z.infer<
    typeof systemsGmstnDevelopmentChannelRecordSchema
>;
