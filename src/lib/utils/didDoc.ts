import { __DEV__, SERVER_PORT, SERVICE_DID } from "@/lib/env";
import {
    didWebSchema,
    type DidDocument,
    type DidWeb,
    type VerificationMethod,
} from "@/lib/types/atproto";
import { Secp256k1PrivateKeyExportable } from "@atcute/crypto";
import { toString as uint8arraysToString } from "uint8arrays";

export interface ServiceKeys {
    atproto: Secp256k1PrivateKeyExportable;
    service: Secp256k1PrivateKeyExportable;
}

export interface CreateDidWebDocResult {
    didDoc: DidDocument;
    keys: ServiceKeys;
}

const buildDidWebDoc = async (
    didWeb: DidWeb,
): Promise<CreateDidWebDocResult> => {
    const atprotoKey = await Secp256k1PrivateKeyExportable.createKeypair();
    const serviceKey = await Secp256k1PrivateKeyExportable.createKeypair();

    const atprotoMultikey = encodeMultikey(
        await atprotoKey.exportPublicKey("raw"),
    );
    const serviceMultikey = encodeMultikey(
        await atprotoKey.exportPublicKey("raw"),
    );

    const { domain, serviceEndpoint } = extractInfoFromDidWeb(didWeb);

    const verificationMethod: Array<VerificationMethod> = [
        {
            id: `${didWeb}#atproto`,
            type: "Multikey",
            controller: didWeb,
            publicKeyMultibase: atprotoMultikey,
        },
    ];

    const didDoc: DidDocument = {
        "@context": [
            "https://www.w3.org/ns/did/v1",
            "https://w3id.org/security/multikey/v1",
            "https://w3id.org/security/suites/secp256k1-2019/v1",
        ],
        id: didWeb,
        verificationMethod,
    };

    if (serviceEndpoint) {
        const serviceEndpointType = "GemstoneShard";

        const serviceEndpointUrl = `https://${domain}/`;

        // @ts-expect-error we are already adding the verificationMethod array above when we create didDoc.
        didDoc.verificationMethod.push({
            id: `${didWeb}#${serviceEndpoint}`,
            type: "Multikey",
            controller: didWeb,
            publicKeyMultibase: serviceMultikey,
        });

        didDoc.service = [
            {
                id: `${didWeb}#${serviceEndpoint}`,
                type: serviceEndpointType,
                serviceEndpoint: serviceEndpointUrl,
            },
        ];
    }

    return {
        didDoc,
        keys: {
            atproto: atprotoKey,
            service: serviceKey,
        },
    };
};

const encodeMultikey = (publicKeyBytes: Uint8Array) => {
    // For secp256k1 (K-256), prefix with 0xE701
    const prefixed = new Uint8Array(publicKeyBytes.length + 2);
    prefixed[0] = 0xe7;
    prefixed[1] = 0x01;
    prefixed.set(publicKeyBytes, 2);

    // Base58-btc encode with 'z' prefix
    const value = uint8arraysToString(prefixed, "base58btc");

    return "z" + value;
};

const extractInfoFromDidWeb = (didWeb: DidWeb) => {
    const fragments = didWeb.split("#");
    return {
        domain: fragments[0].replace("did:web:", ""),
        serviceEndpoint: fragments[1] as string | undefined,
    };
};

const createDidWebDoc = async () => {
    let did = SERVICE_DID;
    if (__DEV__) {
        did = `${did}%3A${SERVER_PORT.toString()}`;
    }
    const { success: isDidWeb, data: didWeb } = didWebSchema.safeParse(did);
    if (!isDidWeb) return;
    const { didDoc } = await buildDidWebDoc(didWeb);
    return didDoc;
};

export const didDoc = await createDidWebDoc();
