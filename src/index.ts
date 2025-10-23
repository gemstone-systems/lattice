import { OWNER_DID, SERVER_PORT, SERVICE_DID } from "@/lib/env";
import { setRegistrationState } from "@/lib/state";
import { getRecordFromAtUri } from "@/lib/utils/atproto";
import { newErrorResponse } from "@/lib/utils/http/responses";
import { connectToPrism } from "@/lib/utils/prism";
import {
    attachLatticeRegistrationListener,
    wrapHttpRegistrationCheck,
    wrapWsRegistrationCheck,
} from "@/lib/utils/registration";
import { routes } from "@/routes";
import { setupServer } from "@/server";

const main = async () => {
    let latticeUrlOrigin = decodeURIComponent(
        SERVICE_DID.startsWith("did:web:") ? SERVICE_DID.slice(8) : "",
    );
    if (latticeUrlOrigin === "localhost")
        latticeUrlOrigin += `:${SERVER_PORT.toString()}`;
    if (latticeUrlOrigin === "") {
        // TODO: resolve did:plc endpoint to get the origin of the lattice endpoint described by the did:plc doc
        // for now we just throw.
        throw new Error(
            "did:plc support not yet implemented. Provide a did:web for now. did:plc support will come in the future.",
        );
    }

    const latticeRecord = await getRecordFromAtUri({
        // @ts-expect-error alas, template literal weirdness continues uwu
        authority: OWNER_DID,
        collection: "systems.gmstn.development.lattice",
        rKey: latticeUrlOrigin,
    });

    if (latticeRecord.ok) setRegistrationState(true);

    const prismWebsocket = connectToPrism({
        wantedCollections: ["systems.gmstn.development.*"],
    });

    attachLatticeRegistrationListener(prismWebsocket);

    const server = await setupServer();
    for (const [url, route] of Object.entries(routes)) {
        if (!route.wsHandler) {
            const { handler, method, skipRegistrationCheck } = route;
            server.route({
                url,
                method,
                handler: skipRegistrationCheck
                    ? handler
                    : wrapHttpRegistrationCheck(handler),
            });
        } else {
            const {
                wsHandler,
                method,
                handler: httpHandler,
                skipRegistrationCheckHttp,
                skipRegistrationCheckWs,
            } = route;
            const handler =
                httpHandler ??
                (() =>
                    newErrorResponse(404, {
                        message:
                            "This is a websocket only route. Did you mean to initiate a websocket connection here?",
                    }));
            server.route({
                url,
                method: method ?? "GET",
                handler: skipRegistrationCheckHttp
                    ? handler
                    : wrapHttpRegistrationCheck(handler),
                wsHandler: skipRegistrationCheckWs
                    ? wsHandler
                    : wrapWsRegistrationCheck(wsHandler),
            });
        }
    }

    server.listen({ port: SERVER_PORT }).catch((err: unknown) => {
        server.log.error(err);
        process.exit(1);
    });
};

main()
    .then(() => {
        console.log(`Server is running on port ${SERVER_PORT.toString()}`);
    })
    .catch((err: unknown) => {
        console.error("Something went wrong :(");
        console.error(
            "=========================== FULL ERROR BELOW ===========================",
        );
        console.error(err);
    });
