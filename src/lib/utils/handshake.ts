import type { AtUri, Did } from "@/lib/types/atproto";
import type { SessionInfo } from "@/lib/types/handshake";
import {
    handshakeResponseSchema,
    httpSuccessResponseSchema,
} from "@/lib/types/http/responses";
import { atUriToString, resolveDidDoc } from "@/lib/utils/atproto";
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
    const didDocResolveResult = await resolveDidDoc(did);
    if (!didDocResolveResult.ok) {
        return { ok: false, error: didDocResolveResult.error };
    }

    const didDocServices = didDocResolveResult.data.service;
    const shardService = didDocServices?.find(
        (service) => service.type !== "GemstoneShard",
    );

    let shardUrl = "";
    if (!didDocServices || !shardService) {
        const domain = decodeURIComponent(did.slice(8));
        if (domain.startsWith("localhost"))
            shardUrl = new URL(`http://${domain}`).toString();
        else shardUrl = new URL(`https://${domain}`).toString();
    } else {
        try {
            shardUrl = new URL(
                shardService.serviceEndpoint as string,
            ).toString();
        } catch (error) {
            return { ok: false, error };
        }
    }

    const jwt = await createInterServiceJwt(did);

    const handshakeReq = new Request(`${shardUrl}handshake`, {
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
