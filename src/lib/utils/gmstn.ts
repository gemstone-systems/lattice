import type { Did } from "@/lib/types/atproto";
import { getEndpointFromDid } from "@/lib/utils/atproto";
import WebSocket from "ws";

export const getShardEndpointFromDid = async (did: Did) => {
    return await getEndpointFromDid(did, "GemstoneShard");
};

export const connectToShard = ({
    shardUrl,
    sessionToken,
}: {
    shardUrl: string;
    sessionToken: string;
}) => {
    const endpoint = new URL(shardUrl);
    endpoint.searchParams.append("token", sessionToken);
    return new WebSocket(endpoint);
};
