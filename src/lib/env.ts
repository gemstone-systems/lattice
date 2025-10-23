import { didSchema } from "@/lib/types/atproto";
import "dotenv/config";
import { z } from "zod";

const nodeEnv = process.env.NODE_ENV;
export const NODE_ENV = nodeEnv ?? "development";

export const isDev = NODE_ENV === "development";
export const __DEV__ = isDev;

const serverPort = process.env.SERVER_PORT;
if (!serverPort)
    console.warn(
        "Environment variable SERVER_PORT not set. Defaulting to 7338",
    );
export const SERVER_PORT = Number.parseInt(serverPort ?? "7338");

const serviceDid = process.env.SERVICE_DID;
const {
    success: serviceDidParseSuccess,
    error: serviceDidParseError,
    data: serviceDidParsed,
} = didSchema.safeParse(serviceDid);
if (!serviceDidParseSuccess) {
    console.warn(serviceDidParseError);
    console.warn(
        "Environment variable SERVICE_DID not set. Defaulting to `did:web:localhost`",
    );
}
export const SERVICE_DID = serviceDidParsed ?? "did:web:localhost";

const ownerDid = process.env.OWNER_DID;
const {
    success: ownerDidParseSuccess,
    error: ownerDidParseError,
    data: ownerDidParsed,
} = didSchema.safeParse(ownerDid);
if (!ownerDidParseSuccess) {
    console.error(
        "Could not parse OWNER_DID environment variable. Ensure that it is set and that it is a valid ATProto DID.",
    );
    console.error(
        "See the example environment variables file for more information. `.example.env` in the project root.",
    );
    throw new Error(z.prettifyError(ownerDidParseError));
}
export const OWNER_DID = ownerDidParsed;

const prismUrl = process.env.PRISM_URL;
let prismUrlParsed: URL | undefined;
try {
    prismUrlParsed = new URL(prismUrl ?? "");
} catch (err) {
    console.warn(
        "Invalid PRISM_URL. Please ensure that the environment variable is a valid URL.",
    );
    console.warn("Falling back to default prism instance.");
    console.warn(err);
}
export const PRISM_URL =
    prismUrlParsed ?? new URL("wss://jetstream.gmstn.systems/subscribe");
