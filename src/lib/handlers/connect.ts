import {
    createNewSession,
    issuedLatticeTokens,
    isValidSession,
} from "@/lib/sessions";
import type { PreHandler, WsRouteHandler } from "@/lib/types/routes";
import { rawDataToString } from "@/lib/utils/ws";

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

    socket.on("message", (event) => {
        const message = rawDataToString(event);
        console.log(message)
    })
};
