import { systemsGmstnDevelopmentChannelMembershipRecordSchema } from "@/lib/types/lexicon/systems.gmstn.development.channel.membership";
import { z } from "zod";

export const latticeHandshakeDataSchema = z.object({
    interServiceJwt: z.string(),
    memberships: z.array(systemsGmstnDevelopmentChannelMembershipRecordSchema),
});
export type LatticeHandshakeData = z.infer<typeof latticeHandshakeDataSchema>;
