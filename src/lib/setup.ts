import type { AtUri, Did } from "@/lib/types/atproto";
import type { SessionInfo } from "@/lib/types/handshake";
import { systemsGmstnDevelopmentChannelRecordSchema } from "@/lib/types/lexicon/systems.gmstn.development.channel";
import {
    atUriToString,
    getRecordFromAtUri,
    stringToAtUri,
} from "@/lib/utils/atproto";
import { getConstellationBacklink } from "@/lib/utils/constellation";
import { isDomain } from "@/lib/utils/domains";
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

    // TODO: move this to a persisted state
    const channelSessions = new Map<AtUri, SessionInfo>();

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

        const handshakeResult = await initiateHandshakeTo({
            did: shardDid,
            channels: channelAtUris,
        });
        if (!handshakeResult.ok) continue;
        const sessionInfo = handshakeResult.data;
        console.log("Handshake to", shardAtUri.rKey, "complete!");
        console.log("Session info:", sessionInfo);
        channelSessions.set(shardAtUri, sessionInfo);
    }
    console.log(channelSessions);
};
