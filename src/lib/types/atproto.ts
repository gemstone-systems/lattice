import { z } from "zod";

export const didPlcSchema = z.templateLiteral(["did:plc:", z.string()]);
export type DidPlc = z.infer<typeof didPlcSchema>;

export const didWebSchema = z.templateLiteral(["did:web:", z.string()]);
export type DidWeb = z.infer<typeof didWebSchema>;

export const didSchema = z.templateLiteral([
    "did:",
    z.string(),
    ":",
    z.string(),
]);
export type Did = z.infer<typeof didSchema>;

export const nsidSchema = z.custom<`${string}.${string}.${string}`>(
    (val): val is `${string}.${string}.${string}` => {
        return (
            typeof val === "string" &&
            /^[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(\.[a-zA-Z]([a-zA-Z0-9]{0,62})?)$/.test(
                val,
            )
        );
    },
    { message: "Invalid atproto nsid format." },
);
export type Nsid = z.infer<typeof nsidSchema>;

export const atprotoHandleSchema = z.custom<`${string}.${string}`>(
    (val): val is `${string}.${string}` => {
        return (
            typeof val === "string" &&
            /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(
                val,
            )
        );
    },
    { message: "Invalid atproto handle format." },
);
export type AtprotoHandle = z.infer<typeof atprotoHandleSchema>;

export const atUriAuthoritySchema = z.union([
    didPlcSchema,
    didWebSchema,
    atprotoHandleSchema,
]);
export type AtUriAuthority = z.infer<typeof atUriAuthoritySchema>;

export const atUriSchema = z.object({
    authority: atUriAuthoritySchema,
    collection: z.optional(nsidSchema),
    rKey: z.optional(z.string()),
});
export type AtUri = z.infer<typeof atUriSchema>;

export const verificationMethodSchema = z.object({
    id: z.string(),
    type: z.string(),
    controller: z.string(),
    publicKeyMultibase: z.optional(z.string()),
});
export type VerificationMethod = z.infer<typeof verificationMethodSchema>;

export const didDocumentSchema = z.object({
    "@context": z.array(z.string()),
    id: didSchema,
    alsoKnownAs: z.optional(z.array(z.string())),
    verificationMethod: z.optional(z.array(verificationMethodSchema)),
    service: z.optional(
        z.array(
            z.object({
                id: z.string(),
                type: z.union([z.string(), z.array(z.string())]),
                serviceEndpoint: z.union([
                    z.string(),
                    z.record(z.string(), z.string()),
                    z.array(
                        z.union([z.string(), z.record(z.string(), z.string())]),
                    ),
                ]),
            }),
        ),
    ),
});
export type DidDocument = z.infer<typeof didDocumentSchema>;

export const comAtprotoRepoStrongRefSchema = z.object({
    $type: z.optional(z.literal("com.atproto.repo.strongRef")),
    cid: z.string(),
    uri: z.string(),
});
export type ComAtprotoRepoStrongRef = z.infer<
    typeof comAtprotoRepoStrongRefSchema
>;
