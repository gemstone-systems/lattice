import { handshakeTokens } from "@/lib/state";
import type { AtUri, Did } from "@/lib/types/atproto";
import { systemsGmstnDevelopmentChannelRecordSchema } from "@/lib/types/lexicon/systems.gmstn.development.channel";
import {
    atUriToString,
    getRecordFromFullAtUri,
    stringToAtUri,
} from "@/lib/utils/atproto";
import { getConstellationBacklink } from "@/lib/utils/constellation";
import { isDomain } from "@/lib/utils/domains";
import { connectToShard, getShardEndpointFromDid } from "@/lib/utils/gmstn";
import { initiateHandshakeTo } from "@/lib/utils/handshake";

export const performHandshakes = async (latticeAtUri: AtUri) => {
    const latticeAtUriString = atUriToString(latticeAtUri);
    const constellationBacklinksResult = await getConstellationBacklink({
        subject: latticeAtUriString,
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
            await getRecordFromFullAtUri({
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

    const channelsByShardEntries = channelsByShard.entries();

    for (const entry of channelsByShardEntries) {
        const shardAtUri = entry[0];

        let shardDid: Did | undefined;
        // TODO: if the rkey of the shard URI is not a valid domain, then it must be a did:plc
        // we need to find a better way to enforce this. we really should explore just resolving the
        // record and then checking the record value for the actual domain instead.
        // did resolution hard;;
        if (
            isDomain(shardAtUri.rKey ?? "") ||
            shardAtUri.rKey?.startsWith("localhost:")
        ) {
            // from the isDomain check, if we pass, we can conclude that
            shardDid = `did:web:${encodeURIComponent(shardAtUri.rKey ?? "")}`;
        } else {
            shardDid = `did:plc:${encodeURIComponent(shardAtUri.rKey ?? "")}`;
        }

        const channelAtUris = entry[1];

        // FIXME: perf issue. we are awaiting each handshake to resolve before we make new ones
        // this means that the handshakes are consecutive and not concurrent.
        // stuff this into a Promise.all by mapping over the array instead
        const handshakeResult = await initiateHandshakeTo({
            did: shardDid,
            channels: channelAtUris,
        });
        if (!handshakeResult.ok) continue;
        const sessionInfo = handshakeResult.data;
        console.log("Handshake to", shardAtUri.rKey, "complete!");
        handshakeTokens.set(shardAtUri, sessionInfo);
    }
};

export const connectToShards = async () => {
    const handshakes = handshakeTokens.entries();
    const shardConnectionPromises = handshakes
        .map(async (handshake) => {
            const atUri = handshake[0];
            const sessionInfo = handshake[1];
            const rkey = atUri.rKey ?? "";
            const shardDid = isDomain(rkey)
                ? `did:web:${encodeURIComponent(rkey)}`
                : `did:plc:${rkey}`;

            console.log(shardDid);

            // TODO: again, implement proper did -> endpoint parsing here too.
            // for now, we just assume did:web and construce a URL based on that.
            // @ts-expect-error trust me bro it's a string
            const shardUrlResult = await getShardEndpointFromDid(shardDid);

            if (!shardUrlResult.ok) return;

            return {
                // TODO: xrpc and lexicon this endpoint
                shardUrl: `${shardUrlResult.data.origin}/connect`,
                sessionInfo,
            };
        })
        .toArray();

    const shardConnectionRequests = await Promise.all(shardConnectionPromises);

    return shardConnectionRequests
        .filter((request) => request !== undefined)
        .map((request) => connectToShard(request));
};
