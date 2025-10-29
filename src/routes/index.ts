import type { Route, WsRoute } from "@/lib/types/routes";
import { connectRoute } from "@/routes/connect/route";
import { didWebDocRoute } from "@/routes/dot-well-known/did-dot-json/route";
import { handshakeRoute } from "@/routes/handshake/route";
import { indexRoute } from "@/routes/route";

export const routes: Record<string, Route | WsRoute> = {
    "/": indexRoute,
    "/.well-known/did.json": didWebDocRoute,
    "/handshake": handshakeRoute,
    "/connect": connectRoute,
};
