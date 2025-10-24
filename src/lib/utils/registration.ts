import { OWNER_DID, SERVICE_DID } from "@/lib/env";
import { getRegistrationState, setRegistrationState } from "@/lib/state";
import { prismCommitSchema } from "@/lib/types/prism";
import type { RouteHandler, WsRouteHandler } from "@/lib/types/routes";
import { newErrorResponse } from "@/lib/utils/http/responses";
import { rawDataToString } from "@/lib/utils/ws";
import type { RawData } from "ws";
import type WebSocket from "ws";

export const wrapHttpRegistrationCheck = (
    routeHandler: RouteHandler,
): RouteHandler => {
    const registrationState = getRegistrationState();
    const wrappedFunction: RouteHandler = (req, rep) => {
        if (!registrationState.registered) {
            return newErrorResponse(503, {
                message:
                    "Lattice has not been registered for use. Register it in the dashboard or make the record yourself using the bootstrapper if you're doing local development.",
            });
        }

        return routeHandler(req, rep);
    };

    return wrappedFunction;
};

export function wrapWsRegistrationCheck(
    wsHandler: WsRouteHandler,
): WsRouteHandler {
    const registrationState = getRegistrationState();
    const wrappedFunction: WsRouteHandler = (socket, request) => {
        if (!registrationState.registered) {
            socket.close(
                1013,
                "Service unavailable: Lattice not yet registered",
            );
            return;
        }

        wsHandler(socket, request);
    };

    return wrappedFunction;
}

export const attachLatticeRegistrationListener = (socket: WebSocket) => {
    socket.on("message", (rawData: RawData) => {
        const data = rawDataToString(rawData);
        const jsonData: unknown = JSON.parse(data);

        const { success: prismCommitParseSuccess, data: prismCommit } =
            prismCommitSchema.safeParse(jsonData);
        if (!prismCommitParseSuccess) return;

        const { did, commit } = prismCommit;
        if (did !== OWNER_DID) return;

        const { rkey } = commit;

        // TODO: replace empty string with call to resolve did doc and the endpoint and yadda yadda etc. etc. you get it.
        // if you don't, then the tl;dr is you need to resolve the did:plc document to get the service endpoint describing this lattice and ensure
        // that the domain/origin/whatever matches with the rkey (or record value if we decide to transition to that)
        const latticeDomain = SERVICE_DID.startsWith("did:web:")
            ? SERVICE_DID.slice(8)
            : "";
        if (rkey !== latticeDomain) return;

        setRegistrationState(true);
    });
};
