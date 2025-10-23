import type {
    AtprotoHandle,
    AtUri,
    Did,
    DidDocument,
} from "@/lib/types/atproto";
import { atprotoHandleSchema } from "@/lib/types/atproto";
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
