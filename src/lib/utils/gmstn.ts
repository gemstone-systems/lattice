import type { Did } from "@/lib/types/atproto";
import { getEndpointFromDid } from "@/lib/utils/atproto";

export const getShardEndpointFromDid = async (did: Did) => {
    return await getEndpointFromDid(did, "GemstoneShard");
};
