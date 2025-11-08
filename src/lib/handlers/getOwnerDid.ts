import { OWNER_DID } from "@/lib/env";
import { getRegistrationState } from "@/lib/state";
import type { RouteHandler } from "@/lib/types/routes";
import { newSuccessResponse } from "@/lib/utils/http/responses";

export const getOwnerHandler: RouteHandler = () => {
    const { registered } = getRegistrationState();
    return newSuccessResponse({ registered, ownerDid: OWNER_DID });
};
