import type { Route } from "@/lib/types/routes";
import { initiateHandshakeTo } from "@/lib/utils/handshake";
import {
    newErrorResponse,
    newSuccessResponse,
} from "@/lib/utils/http/responses";

export const testingRoute: Route = {
    method: "GET",
    handler: async () => {
        const sessionInfo = await initiateHandshakeTo({
            did: "did:web:localhost%3A7337",
            channels: [
                {
                    authority: "did:plc:knucpdtudgdpyoeydicvhzel",
                    collection: "systems.gmstn.development.channel",
                    rKey: "3m3tpcwneq22e",
                },
            ],
        });
        if (!sessionInfo.ok)
            return newErrorResponse(400, {
                message: "something went wrong with the handshake.",
                details: sessionInfo.error,
            });
        return newSuccessResponse({
            sessionInfo: sessionInfo.data,
        });
    },
};
