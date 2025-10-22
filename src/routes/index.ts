import type { Route, WsRoute } from "@/lib/types/routes";
import { indexRoute } from "@/routes/route";

export const routes: Record<string, Route | WsRoute> = {
    "/": indexRoute,
};
