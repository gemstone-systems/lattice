import { getOwnerHandler } from "@/lib/handlers/getOwnerDid";
import type { Route } from "@/lib/types/routes";

export const systemsGmstnDevelopmentShardGetOwnerRoute: Route = {
    method: "GET",
    handler: getOwnerHandler,
};
