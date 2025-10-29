import { connectPreHandler, connectWsHandler } from "@/lib/handlers/connect";
import type { WsRoute } from "@/lib/types/routes";

export const connectRoute: WsRoute = {
    wsHandler: connectWsHandler,
    preHandler: connectPreHandler,
};
