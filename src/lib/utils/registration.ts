import { getRegistrationState } from "@/lib/state";
import type { RouteHandler, WsRouteHandler } from "@/lib/types/routes";
import { newErrorResponse } from "@/lib/utils/http/responses";

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
