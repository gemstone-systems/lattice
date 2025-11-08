import type { Route, WsRoute } from "@/lib/types/routes";
import { connectRoute } from "@/routes/connect/route";
import { didWebDocRoute } from "@/routes/dot-well-known/did-dot-json/route";
import { handshakeRoute } from "@/routes/handshake/route";
import { indexRoute } from "@/routes/route";
import { healthRoute } from "@/routes/xrpc/_health/route";
import { systemsGmstnDevelopmentShardGetOwnerRoute } from "@/routes/xrpc/systems.gmstn.development.lattice.getOwner/route";

export const routes: Record<string, Route | WsRoute> = {
    "/": indexRoute,
    "/.well-known/did.json": didWebDocRoute,
    "/handshake": handshakeRoute,
    "/connect": connectRoute,
    "/xrpc/_health": healthRoute,
    "/xrpc/systems.gmstn.development.lattice.getOwner":
        systemsGmstnDevelopmentShardGetOwnerRoute,
};
