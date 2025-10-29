import { shardSessions } from "@/lib/state";
import type { AtUri, Did } from "@/lib/types/atproto";
import type { ShardSessionInfo } from "@/lib/types/handshake";
import type { ShardMessage } from "@/lib/types/messages";
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

export const storeMessageInShard = ({
    channelAtUri,
    message,
}: {
    channelAtUri: AtUri;
    message: ShardMessage;
}) => {
    const sessionInfo = shardSessions
        .keys()
        .find((sessionInfo) =>
            sessionInfo.allowedChannels.some(
                (allowedChannel) => allowedChannel.rKey === channelAtUri.rKey,
            ),
        );
    if (!sessionInfo) return;

    const shardSocket = shardSessions.get(sessionInfo);
    if (!shardSocket) {
        console.error(
            "Could find session info object in map, but socket could not be retrieved from map. Race condition?",
        );
        return;
    }
    if (shardSocket.readyState === WebSocket.OPEN)
        shardSocket.send(JSON.stringify(message));

    console.log(
        "Sent off message",
        message,
        "to shard located at",
        shardSocket.url,
    );
};
