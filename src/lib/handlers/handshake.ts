import { OWNER_DID, SERVICE_DID } from "@/lib/env";
import { issueNewLatticeToken } from "@/lib/sessions";
import { HttpGeneralErrorType } from "@/lib/types/http/errors";
import { handshakeDataSchema } from "@/lib/types/http/handlers";
import { systemsGmstnDevelopmentChannelRecordSchema } from "@/lib/types/lexicon/systems.gmstn.development.channel";
import type { RouteHandler } from "@/lib/types/routes";
import { stringToAtUri } from "@/lib/utils/atproto";
import {
    getConstellationBacklink,
    getPdsRecordFromBacklink,
} from "@/lib/utils/constellation";
import {
    newErrorResponse,
    newSuccessResponse,
} from "@/lib/utils/http/responses";
import { verifyServiceJwt } from "@/lib/utils/verifyJwt";
import { z } from "zod";

export const handshakeHandler: RouteHandler = async (req) => {
    const {
        success: handshakeParseSuccess,
        error: handshakeParseError,
        data: handshakeData,
    } = handshakeDataSchema.safeParse(req.body);
    if (!handshakeParseSuccess) {
        return newErrorResponse(400, {
            message: HttpGeneralErrorType.TYPE_ERROR,
            details: z.treeifyError(handshakeParseError),
        });
    }

    const { interServiceJwt, channelAtUris: channelAtUriStrings } =
        handshakeData;
    const allowedChannels = channelAtUriStrings.map((channel) => {
        const res = stringToAtUri(channel);
        if (!res.ok) return;
        return res.data;
    });

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

    // TODO:
    // if(PRIVATE_SHARD) doAllowCheck()
    // see the sequence diagram for the proper flow.
    // not implemented for now because we support public first

    const constellationResponse = await getConstellationBacklink({
        subject: `at://${OWNER_DID}/systems.gmstn.development.shard/${SERVICE_DID.slice(8)}`,
        source: {
            nsid: "systems.gmstn.development.channel",
            fieldName: "storeAt.uri",
        },
    });
    if (!constellationResponse.ok) {
        const { error } = constellationResponse;
        if ("fetchStatus" in error)
            return newErrorResponse(error.fetchStatus, {
                message:
                    "Could not fetch backlinks from constellation. Likely something went wrong on our side.",
                details: error.message,
            });
        else
            return newErrorResponse(400, {
                message: HttpGeneralErrorType.TYPE_ERROR,
                details: z.treeifyError(error),
            });
    }

    const pdsRecordFetchPromises = constellationResponse.data.records.map(
        async (backlink) => {
            const recordResult = await getPdsRecordFromBacklink(backlink);
            if (!recordResult.ok) {
                console.error(
                    `something went wrong fetching the record from the given backlink ${JSON.stringify(backlink)}`,
                );
                throw new Error(
                    JSON.stringify({ error: recordResult.error, backlink }),
                );
            }
            return recordResult.data;
        },
    );

    let pdsChannelRecords;
    try {
        pdsChannelRecords = await Promise.all(pdsRecordFetchPromises);
    } catch (err) {
        return newErrorResponse(500, {
            message:
                "Something went wrong when fetching backlink channel records. Check the Shard logs if possible.",
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
                "One of the backlinks returned by Constellation did not resolve to a proper lexicon Channel record.",
            details: z.treeifyError(channelRecordsParseError),
        });
    }

    // TODO:
    // for private shards, ensure that the channels described by constellation backlinks are made
    // by authorised parties (check owner pds for workspace management permissions)
    // do another fetch to owner's pds first to grab the records, then cross-reference with the
    // did of the backlink. if there are any channels described by unauthorised parties, simply drop them.

    let mismatchOrIncorrect = false;
    const requestingLatticeDid = verifyJwtResult.value.issuer;

    channelRecordsParsed.forEach((channel) => {
        if (mismatchOrIncorrect) return;

        const { storeAt: storeAtRecord, routeThrough: routeThroughRecord } =
            channel;
        const storeAtRecordParseResult = stringToAtUri(storeAtRecord.uri);
        if (!storeAtRecordParseResult.ok) {
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
        if (storeAtUri.rKey !== SERVICE_DID.slice(8)) {
            mismatchOrIncorrect = true;
            return;
        }

        const routeThroughRecordParseResult = stringToAtUri(
            routeThroughRecord.uri,
        );
        if (!routeThroughRecordParseResult.ok) {
            mismatchOrIncorrect = true;
            return;
        }
        const routeThroughUri = routeThroughRecordParseResult.data;

        // FIXME: this also assumes that the requesting lattice's DID is a did:web
        // see above for the rest of the issues.
        if (routeThroughUri.rKey === requestingLatticeDid.slice(8)) {
            mismatchOrIncorrect = true;
            return;
        }
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (mismatchOrIncorrect)
        return newErrorResponse(400, {
            message:
                "Channels provided during the handshake had a mismatch between the channel values. Ensure that you are only submitting exactly the channels you have access to.",
        });

    // yipee, it's a valid request :3

    const sessionInfo = issueNewLatticeToken({
        allowedChannels,
        clientDid: verifyJwtResult.value.issuer,
    });

    return newSuccessResponse({ sessionInfo });
};
