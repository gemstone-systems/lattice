import type { AtUri, Did } from "@/lib/types/atproto";
import type { SessionInfo } from "@/lib/types/handshake";
import {
    handshakeResponseSchema,
    httpSuccessResponseSchema,
} from "@/lib/types/http/responses";
import { atUriToString } from "@/lib/utils/atproto";
import { getShardEndpointFromDid } from "@/lib/utils/gmstn";
import { createInterServiceJwt } from "@/lib/utils/jwt";
import type { Result } from "@/lib/utils/result";
import z from "zod";

export const initiateHandshakeTo = async ({
    did,
    channels,
}: {
    did: Did;
    channels: Array<AtUri>;
}): Promise<Result<SessionInfo, unknown>> => {
    const shardUrlResult = await getShardEndpointFromDid(did);
    if (!shardUrlResult.ok) return { ok: false, error: shardUrlResult.error };

    const jwt = await createInterServiceJwt(did);

    const shardBaseUrl = shardUrlResult.data.origin;

    const handshakeReq = new Request(`${shardBaseUrl}/handshake`, {
        method: "POST",
        body: JSON.stringify({
            interServiceJwt: jwt,
            channelAtUris: channels.map((channel) => atUriToString(channel)),
        }),
        headers: {
            "Content-Type": "application/json",
        },
    });
    const handshakeRes = await fetch(handshakeReq);
    const handshakeResponseData: unknown = await handshakeRes.json();

    const {
        success: httpResponseParseSuccess,
        error: httpResponseParseError,
        data: handshakeResponseDataParsed,
    } = httpSuccessResponseSchema.safeParse(handshakeResponseData);
    if (!httpResponseParseSuccess)
        return {
            ok: false,
            error: z.treeifyError(httpResponseParseError),
        };

    const { data: handshakeData } = handshakeResponseDataParsed;

    const {
        success: handshakeDataParseSuccess,
        error: handshakeDataParseError,
        data: handshakeDataParsed,
    } = handshakeResponseSchema.safeParse(handshakeData);
    if (!handshakeDataParseSuccess)
        return { ok: false, error: z.treeifyError(handshakeDataParseError) };

    const { sessionInfo } = handshakeDataParsed;

    return { ok: true, data: sessionInfo };
};
