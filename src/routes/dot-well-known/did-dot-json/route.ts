import { SERVICE_DID } from "@/lib/env";
import type { Did } from "@/lib/types/atproto";
import { didDocumentSchema, didWebSchema } from "@/lib/types/atproto";
import type { Route, RouteHandler } from "@/lib/types/routes";
import { DID_DOCUMENT } from "@/lib/utils/didDoc";
import { newErrorResponse } from "@/lib/utils/http/responses";
import { z } from "zod";

const routeHandlerFactory = (did: Did) => {
    const serveDidPlc: RouteHandler = async () => {
        const plcDirectoryReq = new Request(`https://plc.directory/${did}`);
        const plcDirectoryRes = await fetch(plcDirectoryReq);
        const {
            success,
            data: didDocument,
            error,
        } = didDocumentSchema.safeParse(await plcDirectoryRes.json());

        if (!success)
            return newErrorResponse(500, {
                message:
                    "Parsing the DID document from a public ledger failed. Either the Shard's did:plc is wrong, the did:plc was not registered with a public ledger, or there is something wrong with the public ledger.",
                details: z.treeifyError(error),
            });

        return Response.json(didDocument);
    };

    const { success: isDidWeb } = didWebSchema.safeParse(did);
    if (!isDidWeb) return serveDidPlc;

    const serveDidDoc: RouteHandler = () => {
        const didDoc = DID_DOCUMENT;
        if (!didDoc) {
            return newErrorResponse(500, {
                message:
                    "Somehow tried to serve a did:web document when no did:web document was available. Specifically, somehow parsing the same SERVICE_DID environment variable resulted in both a did:web and a not did:web",
            });
        }

        // NOTE: might seem sus, but it's much harder to actually expose out private keys lol
        return Response.json(didDoc.didDoc);
    };

    return serveDidDoc;
};

export const didWebDocRoute: Route = {
    method: "GET",
    handler: routeHandlerFactory(SERVICE_DID),
};
