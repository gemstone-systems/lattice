import { didSchema } from "@/lib/types/atproto";
import "dotenv/config";

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
