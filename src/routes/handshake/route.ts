import { clientHandshakeHandler } from "@/lib/handlers/handshake";
import type { Route } from "@/lib/types/routes";

export const handshakeRoute: Route = {
    method: "POST",
    handler: clientHandshakeHandler,
};
