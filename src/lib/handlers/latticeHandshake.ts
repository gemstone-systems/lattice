import { SERVICE_DID } from "@/lib/env";
import { issueNewLatticeToken } from "@/lib/sessions";
import { shardSessions } from "@/lib/state";
import { HttpGeneralErrorType } from "@/lib/types/http/errors";
import { latticeHandshakeDataSchema } from "@/lib/types/http/handlers";
import { systemsGmstnDevelopmentChannelRecordSchema } from "@/lib/types/lexicon/systems.gmstn.development.channel";
import { systemsGmstnDevelopmentChannelInviteRecordSchema } from "@/lib/types/lexicon/systems.gmstn.development.channel.invite";
import type { RouteHandler } from "@/lib/types/routes";
import { getRecordFromFullAtUri, stringToAtUri } from "@/lib/utils/atproto";
import {
    newErrorResponse,
    newSuccessResponse,
} from "@/lib/utils/http/responses";
import { verifyServiceJwt } from "@/lib/utils/verifyJwt";
import { z } from "zod";

export const latticeHandshakeHandler: RouteHandler = async (req) => {
    const {
        success: handshakeParseSuccess,
        error: handshakeParseError,
        data: handshakeData,
    } = latticeHandshakeDataSchema.safeParse(req.body);
    if (!handshakeParseSuccess) {
        return newErrorResponse(400, {
            message: HttpGeneralErrorType.TYPE_ERROR,
            details: z.treeifyError(handshakeParseError),
        });
    }

    const { interServiceJwt, memberships } = handshakeData;

    const verifyJwtResult = await verifyServiceJwt(interServiceJwt);
    if (!verifyJwtResult.ok) {
        const { error } = verifyJwtResult;
        return newErrorResponse(
            401,
            {
                message:
                    "JWT authentication failed. Did you submit the right inter-service JWT to the right endpoint with the right signatures?",
                details: error,
            },
            {
                headers: {
                    "WWW-Authenticate":
                        'Bearer error="invalid_token", error_description="JWT signature verification failed"',
                },
            },
        );
    }

    const { value: verifiedJwt } = verifyJwtResult;

    // TODO:
    // if(PRIVATE_LATTICE) doAllowCheck()
    // see the sequence diagram for the proper flow.
    // not implemented for now because we support public first

    const pdsInviteRecordFetchPromises = memberships.map(async (membership) => {
        const inviteAtUriResult = stringToAtUri(membership.invite.uri);
        if (!inviteAtUriResult.ok) return;
        const { data: inviteAtUri } = inviteAtUriResult;
        if (!inviteAtUri.collection || !inviteAtUri.rKey) return;
        const recordResult = await getRecordFromFullAtUri(inviteAtUri);
        if (!recordResult.ok) {
            console.error(
                `something went wrong fetching the invite record from the given membership ${JSON.stringify(membership)}`,
            );
            return;
        }
        return recordResult.data;
    });

    let pdsInviteRecords;
    try {
        pdsInviteRecords = (
            await Promise.all(pdsInviteRecordFetchPromises)
        ).filter((val) => val !== undefined);
    } catch (err) {
        return newErrorResponse(500, {
            message:
                "Something went wrong when fetching membership invite records. Check the Shard logs if possible.",
            details: err,
        });
    }

    const {
        success: inviteRecordsParseSuccess,
        error: inviteRecordsParseError,
        data: inviteRecordsParsed,
    } = z
        .array(systemsGmstnDevelopmentChannelInviteRecordSchema)
        .safeParse(pdsInviteRecords);
    if (!inviteRecordsParseSuccess) {
        return newErrorResponse(500, {
            message:
                "One of the membership records provided did not resolve to a proper lexicon Invite record.",
            details: z.treeifyError(inviteRecordsParseError),
        });
    }

    for (const invite of inviteRecordsParsed) {
        if (invite.recipient !== verifiedJwt.issuer)
            return newErrorResponse(403, {
                message:
                    "Memberships resolved to invites, but the provided JWT's issuer does not match with the recipient DIDs of the invites. Please check the provided membership records.",
            });
    }

    const pdsChannelRecordFetchPromises = inviteRecordsParsed.map(
        async (invite) => {
            const channelAtUriResult = stringToAtUri(invite.channel.uri);
            if (!channelAtUriResult.ok) return;
            const { data: channelAtUri } = channelAtUriResult;
            if (!channelAtUri.collection || !channelAtUri.rKey) return;
            const recordResult = await getRecordFromFullAtUri(channelAtUri);
            if (!recordResult.ok) {
                console.error(
                    `something went wrong fetching the channel record from the given membership ${JSON.stringify(invite)}`,
                );
                throw new Error(
                    JSON.stringify({ error: recordResult.error, invite }),
                );
            }
            return recordResult.data;
        },
    );

    let pdsChannelRecords;
    try {
        pdsChannelRecords = await Promise.all(pdsChannelRecordFetchPromises);
    } catch (err) {
        return newErrorResponse(500, {
            message:
                "Something went wrong when fetching membership channel records. Check the Shard logs if possible.",
            details: err,
        });
    }

    const {
        success: channelRecordsParseSuccess,
        error: channelRecordsParseError,
        data: channelRecordsParsed,
    } = z
        .array(systemsGmstnDevelopmentChannelRecordSchema)
        .safeParse(pdsChannelRecords);
    if (!channelRecordsParseSuccess) {
        return newErrorResponse(500, {
            message:
                "One of the membership records provided did not resolve to a proper lexicon Channel record.",
            details: z.treeifyError(channelRecordsParseError),
        });
    }

    // TODO:
    // for private shards, ensure that the channels described by constellation backlinks are made
    // by authorised parties (check owner pds for workspace management permissions)
    // do another fetch to owner's pds first to grab the records, then cross-reference with the
    // did of the backlink. if there are any channels described by unauthorised parties, simply drop them.

    let mismatchOrIncorrect = false;
    const errors: Array<unknown> = [];
    const existingShardConnectionShardDids = shardSessions
        .keys()
        .toArray()
        .map((shardConnections) => {
            return shardConnections.shardDid.slice(8);
        });

    channelRecordsParsed.forEach((channel) => {
        if (mismatchOrIncorrect) return;

        const { storeAt: storeAtRecord, routeThrough: routeThroughRecord } =
            channel;

        const routeThroughRecordParseResult = stringToAtUri(
            routeThroughRecord.uri,
        );
        if (!routeThroughRecordParseResult.ok) {
            errors.push(routeThroughRecordParseResult.error);
            mismatchOrIncorrect = true;
            return;
        }
        const routeThroughUri = routeThroughRecordParseResult.data;

        // FIXME: this also assumes that the requesting lattice's DID is a did:web
        // see below for the rest of the issues.
        if (routeThroughUri.rKey !== SERVICE_DID.slice(8)) {
            errors.push(
                "Mismatch between claimant lattice and channel routeThrough. Request wants to validate for",
                routeThroughUri.rKey,
                ", but this lattice is",
                SERVICE_DID.slice(8),
            );
            mismatchOrIncorrect = true;
            return;
        }
        const storeAtRecordParseResult = stringToAtUri(storeAtRecord.uri);
        if (!storeAtRecordParseResult.ok) {
            errors.push(storeAtRecordParseResult.error);
            mismatchOrIncorrect = true;
            return;
        }
        const storeAtUri = storeAtRecordParseResult.data;

        // FIXME: this assumes that the current shard's SERVICE_DID is a did:web.
        // we should resolve the full record or add something that can tell us where to find this shard.
        // likely, we should simply resolve the described shard record, which we can technically do faaaaar earlier on in the request
        // or even store it in memory upon first boot of a shard.
        // also incorrectly assumes that the storeAt rkey is a domain when it can in fact be anything.
        // we should probably just resolve this properly first but for now, i cba.

        if (!storeAtUri.rKey) return;

        if (
            !existingShardConnectionShardDids.includes(
                encodeURIComponent(storeAtUri.rKey),
            )
        ) {
            errors.push(
                "Mismatch between claimant shard and channel storeAt. Request wants to validate for",
                storeAtUri.rKey,
                ", but this lattice is only allowed to talk to",
                existingShardConnectionShardDids,
            );
            mismatchOrIncorrect = true;
            return;
        }
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (mismatchOrIncorrect)
        return newErrorResponse(400, {
            message:
                "Channels provided during the handshake had a mismatch between the channel values. Ensure that you are only submitting exactly the channels you have access to.",
            details: errors,
        });

    // yipee, it's a valid request :3

    const allowedChannels = inviteRecordsParsed.map((invite) => {
        const res = stringToAtUri(invite.channel.uri);
        if (!res.ok) return;
        return res.data;
    });

    const sessionInfo = issueNewLatticeToken({
        allowedChannels,
        clientDid: verifyJwtResult.value.issuer,
    });

    return newSuccessResponse({ sessionInfo });
};
