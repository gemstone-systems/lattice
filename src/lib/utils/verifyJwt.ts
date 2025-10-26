import { SERVER_PORT, SERVICE_DID } from "@/lib/env";
import { didDocResolver } from "@/lib/utils/atproto";
import { ServiceJwtVerifier } from "@atcute/xrpc-server/auth";

export const verifyServiceJwt = async (jwt: string) => {
    const serviceDid = SERVICE_DID.startsWith("did:web:localhost")
        ? (`${SERVICE_DID}%3A${SERVER_PORT.toString()}` as `did:${string}:${string}`)
        : SERVICE_DID;
    const verifier = new ServiceJwtVerifier({
        resolver: didDocResolver,
        serviceDid,
    });
    return await verifier.verify(jwt);
};
