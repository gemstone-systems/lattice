import { latticeHandshakeHandler } from "@/lib/handlers/latticeHandshake";
import type { Route } from "@/lib/types/routes";

export const handshakeRoute: Route = {
    method: "POST",
    handler: latticeHandshakeHandler,
};
