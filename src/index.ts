import { OWNER_DID, SERVER_PORT, SERVICE_DID } from "@/lib/env";
import { setRegistrationState } from "@/lib/state";
import type { AtUri, Did } from "@/lib/types/atproto";
import { systemsGmstnDevelopmentChannelRecordSchema } from "@/lib/types/lexicon/systems.gmstn.development.channel";
import { getRecordFromAtUri, stringToAtUri } from "@/lib/utils/atproto";
import { getConstellationBacklink } from "@/lib/utils/constellation";
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

    // TODO: probably move this to an `attachListeners` hook that attaches the listeners we want.
    attachLatticeRegistrationListener(prismWebsocket);

    const constellationBacklinksResult = await getConstellationBacklink({
        subject: SERVICE_DID,
        source: {
            nsid: "systems.gmstn.development.channel",
            fieldName: "routeThrough.uri",
        },
    });

    if (!constellationBacklinksResult.ok) {
        throw new Error(
            "Something went wrong fetching constellation backlinks to do Shard handshakes",
        );
    }

    const { records: channelBacklinks } = constellationBacklinksResult.data;

    // TODO: For private lattices, do permission check on owner's PDS
    // and filter out records from unauthorised pdses.

    const channelRecordsPromises = channelBacklinks.map(
        async ({ did, collection, rkey }) =>
            await getRecordFromAtUri({
                // @ts-expect-error seriously i gotta do something about the template literals not converting properly SIGH
                authority: did,
                collection,
                rKey: rkey,
            }),
    );

    const channelRecordResults = await Promise.all(channelRecordsPromises);

    // mapping of shard -> list of channels (all AtUris)
    const channelsByShard = new Map<AtUri, Array<AtUri>>();

    channelRecordResults.forEach((result, idx) => {
        if (!result.ok) return;
        const { success, data: channelRecord } =
            systemsGmstnDevelopmentChannelRecordSchema.safeParse(result.data);
        if (!success) return;
        const { storeAt } = channelRecord;

        const storeAtAtUriResult = stringToAtUri(storeAt.uri);
        if (!storeAtAtUriResult.ok) return;
        const storeAtAtUri = storeAtAtUriResult.data;

        // this is fine because Promise.all() preserves the order of the arrays
        const {
            did: authority,
            collection,
            rkey: rKey,
        } = channelBacklinks[idx];

        const existingMapValue = channelsByShard.get(storeAtAtUri);

        const currentChannelUri: Required<AtUri> = {
            // @ts-expect-error seriously i gotta do something about the template literals not converting properly SIGH
            authority,
            collection,
            rKey,
        };

        if (!existingMapValue) {
            channelsByShard.set(storeAtAtUri, [currentChannelUri]);
        } else {
            const prevUris = existingMapValue;
            channelsByShard.set(storeAtAtUri, [...prevUris, currentChannelUri]);
        }
    });

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
