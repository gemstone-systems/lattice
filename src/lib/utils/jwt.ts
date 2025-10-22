import type { Did } from "@/lib/types/atproto";
import { DID_DOCUMENT } from "@/lib/utils/didDoc";
import { createServiceJwt } from "@atcute/xrpc-server/auth";

export const createInterServiceJwt = async (audience: Did) => {
    if (DID_DOCUMENT) {
        // if DID_DOCUMENT is not undefined, it means the Lattice has a did:web document.
        const keypair = DID_DOCUMENT.keys.atproto;
        return await createServiceJwt({
            keypair,
            issuer: DID_DOCUMENT.didDoc.id,
            audience,
            lxm: null,
        });
    } else {
        // else, we know that there is a did:plc that describes this lattice as an endpoint.
        // in which case, we resolve with plc.directory and then ask the repo to create a JWT for us.
        throw new Error(
            "creation of inter-service JWTs with a did:plc is not yet implemented.",
        );
    }
};
