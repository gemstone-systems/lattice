import {
    createNewSession,
    issuedLatticeTokens,
    isValidSession,
} from "@/lib/sessions";
import { shardSessions } from "@/lib/state";
import type { ShardMessage } from "@/lib/types/messages";
import type { PreHandler, WsRouteHandler } from "@/lib/types/routes";
import { stringToAtUri } from "@/lib/utils/atproto";
import { storeMessageInShard } from "@/lib/utils/gmstn";
import {
    rawDataToString,
    validateWsMessageType,
} from "@/lib/utils/ws/validate";

export const connectPreHandler: PreHandler = (req, reply, done) => {
    const { query } = req;
    if (!query) return;
    if (!(typeof query === "object" && "token" in query)) {
        reply.code(400).send("Provide token in query params");
        return;
    }

    const sessionToken = query.token as string;

    const sessionInfo = issuedLatticeTokens.get(sessionToken);
    if (!sessionInfo) {
        reply
            .code(404)
            .send(
                "Session token could not resolve to existing session. retry?",
            );
        return;
    }

    if (!isValidSession(sessionInfo)) {
        reply
            .code(403)
            .send(
                "Session token resolved to session, but did not pass verification. this should not happen.",
            );
        return;
    }

    console.log(
        "Found session:",
        sessionInfo.id,
        "from session token",
        sessionToken,
    );
    done();
};

export const connectWsHandler: WsRouteHandler = (socket, req) => {
    const { query } = req;
    if (!query) return;
    if (!(typeof query === "object" && "token" in query)) {
        socket.close();
        return;
    }
    const sessionToken = query.token as string;

    const sessionInfo = issuedLatticeTokens.get(sessionToken);
    if (!sessionInfo) {
        socket.close();
        return;
    }

    const sessionCreateResult = createNewSession({ sessionInfo, socket });
    if (!sessionCreateResult.ok) {
        socket.close();
        return;
    }

    socket.on("message", (rawData) => {
        const event = rawDataToString(rawData);

        const data: unknown = JSON.parse(event);
        const validateTypeResult = validateWsMessageType(data);
        if (!validateTypeResult.ok) return;

        const { type: messageType } = validateTypeResult.data;

        switch (messageType) {
            case "shard/message": {
                const shardMessage = validateTypeResult.data as ShardMessage;
                const { channel } = shardMessage;
                const atUriParseResult = stringToAtUri(channel);
                if (!atUriParseResult.ok) return;
                const { data: channelAtUri } = atUriParseResult;

                storeMessageInShard({ channelAtUri, message: shardMessage });
            }
        }
    });
};
