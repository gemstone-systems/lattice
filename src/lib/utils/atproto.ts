import type {
    AtprotoHandle,
    AtUri,
    Did,
    DidDocument,
} from "@/lib/types/atproto";
import {
    atprotoHandleSchema,
    atUriAuthoritySchema,
    nsidSchema,
} from "@/lib/types/atproto";
import { comAtprotoRepoGetRecordResponseSchema } from "@/lib/types/lexicon/com.atproto.repo.getRecord";
import type { Result } from "@/lib/utils/result";
import type { DidDocumentResolver } from "@atcute/identity-resolver";
import {
    CompositeDidDocumentResolver,
    CompositeHandleResolver,
    DohJsonHandleResolver,
    PlcDidDocumentResolver,
    WebDidDocumentResolver,
    WellKnownHandleResolver,
} from "@atcute/identity-resolver";
import { z } from "zod";

export const getRecordFromFullAtUri = async ({
    authority,
    collection,
    rKey,
}: AtUri): Promise<Result<unknown, unknown>> => {
    const didDocResult = await resolveDidDoc(authority);
    if (!didDocResult.ok) return { ok: false, error: didDocResult.error };

    if (!collection || !rKey)
        return {
            ok: false,
            error: "No rkey or collection found in provided AtUri object",
        };

    const { service: services } = didDocResult.data;
    if (!services)
        return {
            ok: false,
            error: { message: "Resolved DID document has no service field." },
        };

    const pdsService = services.find(
        (service) =>
            service.id === "#atproto_pds" &&
            service.type === "AtprotoPersonalDataServer",
    );

    if (!pdsService)
        return {
            ok: false,
            error: {
                message:
                    "Resolved DID document has no PDS service listed in the document.",
            },
        };

    const pdsEndpointRecord = pdsService.serviceEndpoint;
    let pdsEndpointUrl;
    try {
        // @ts-expect-error yes, we are coercing something that is explicitly not a string into a string, but in this case we want to be specific. only serviceEndpoints with valid atproto pds URLs should be allowed.
        pdsEndpointUrl = new URL(pdsEndpointRecord).origin;
    } catch (err) {
        return { ok: false, error: err };
    }
    const req = new Request(
        `${pdsEndpointUrl}/xrpc/com.atproto.repo.getRecord?repo=${didDocResult.data.id}&collection=${collection}&rkey=${rKey}`,
    );

    const res = await fetch(req);
    const data: unknown = await res.json();

    const {
        success: responseParseSuccess,
        error: responseParseError,
        data: record,
    } = comAtprotoRepoGetRecordResponseSchema.safeParse(data);
    if (!responseParseSuccess) {
        return { ok: false, error: responseParseError };
    }
    return { ok: true, data: record.value };
};

export const didDocResolver: DidDocumentResolver =
    new CompositeDidDocumentResolver({
        methods: {
            plc: new PlcDidDocumentResolver(),
            web: new WebDidDocumentResolver(),
        },
    });

export const handleResolver = new CompositeHandleResolver({
    strategy: "dns-first",
    methods: {
        dns: new DohJsonHandleResolver({
            dohUrl: "https://mozilla.cloudflare-dns.com/dns-query",
        }),
        http: new WellKnownHandleResolver(),
    },
});

export const resolveDidDoc = async (
    authority: Did | AtprotoHandle,
): Promise<Result<DidDocument, unknown>> => {
    const { data: handle } = atprotoHandleSchema.safeParse(authority);
    let did: Did;
    if (handle) {
        try {
            did = await handleResolver.resolve(handle);
        } catch (err) {
            return { ok: false, error: err };
        }
    } else {
        // @ts-expect-error if handle is undefined, then we know that authority must be a valid did:web or did:plc
        did = authority;
    }
    try {
        const doc: DidDocument = await didDocResolver.resolve(did);
        return { ok: true, data: doc };
    } catch (err) {
        return { ok: false, error: err };
    }
};

// thank u julie
export const atUriRegexp =
    /^at:\/\/([a-zA-Z0-9._:%-]+)(?:\/([a-zA-Z0-9-.]+)(?:\/([a-zA-Z0-9._~:@!$&%')(*+,;=-]+))?)?(?:#(\/[a-zA-Z0-9._~:@!$&%')(*+,;=\-[\]/\\]*))?$/;

export const atUriToString = ({ authority, collection, rKey }: AtUri) => {
    let result = `at://${authority}`;
    result += collection ? `/${collection}` : "";
    result += rKey ? `/${rKey}` : "";
    return result;
};

export const stringToAtUri = (str: string): Result<AtUri, unknown> => {
    const isValidAtUri = atUriRegexp.test(str);
    if (!isValidAtUri)
        return {
            ok: false,
            error: { message: "Input string was not a valid at:// URI" },
        };

    const fragments = str.split("/");
    if (fragments.length <= 2)
        return {
            ok: false,
            error: { message: "Input string was not a valid at:// URI." },
        };

    const {
        success: authorityParseSuccess,
        error: authorityParseError,
        data: authorityParsed,
    } = atUriAuthoritySchema.safeParse(fragments[2]);
    if (!authorityParseSuccess)
        return {
            ok: false,
            error: {
                message:
                    "Input at:// URI was a valid shape, but somehow could not parse the first fragment as a valid authority.",
                details: z.treeifyError(authorityParseError),
            },
        };

    const {
        success: nsidParseSuccess,
        error: nsidParseError,
        data: nsidParsed,
    } = nsidSchema.safeParse(fragments[3]);
    if (fragments[3] && !nsidParseSuccess)
        return {
            ok: false,
            error: {
                message:
                    "Input at:// URI was a valid shape and had a second fragment, but was somehow not a valid NSID.",
                details: z.treeifyError(nsidParseError),
            },
        };

    return {
        ok: true,
        data: {
            authority: authorityParsed,
            collection: nsidParsed,
            rKey: fragments[4],
        },
    };
};

export const getEndpointFromDid = async (
    did: Did,
    serviceType: string,
): Promise<Result<URL, unknown>> => {
    const didDocResolveResult = await resolveDidDoc(did);
    if (!didDocResolveResult.ok) {
        return { ok: false, error: didDocResolveResult.error };
    }

    const didDocServices = didDocResolveResult.data.service;
    const shardService = didDocServices?.find(
        (service) => service.type !== serviceType,
    );

    let shardUrl: URL | undefined;
    if (!didDocServices || !shardService) {
        const domain = decodeURIComponent(did.slice(8));
        if (domain.startsWith("localhost"))
            shardUrl = new URL(`http://${domain}`);
        else shardUrl = new URL(`https://${domain}`);
    } else {
        try {
            shardUrl = new URL(shardService.serviceEndpoint as string);
        } catch (error) {
            return { ok: false, error };
        }
    }
    return { ok: true, data: shardUrl };
};
