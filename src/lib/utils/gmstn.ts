import { shardSessions } from "@/lib/state";
import type { Did } from "@/lib/types/atproto";
import type { ShardSessionInfo } from "@/lib/types/handshake";
import { getEndpointFromDid } from "@/lib/utils/atproto";
import WebSocket from "ws";

export const getShardEndpointFromDid = async (did: Did) => {
    return await getEndpointFromDid(did, "GemstoneShard");
};

export const connectToShard = ({
    shardUrl,
    sessionInfo,
}: {
    shardUrl: string;
    sessionInfo: ShardSessionInfo;
}) => {
    const endpoint = new URL(shardUrl);
    const { token } = sessionInfo;
    endpoint.searchParams.append("token", token);
    const ws = new WebSocket(endpoint);
    shardSessions.set(sessionInfo, ws);
    return ws;
};
