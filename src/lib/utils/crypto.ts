import * as crypto from "node:crypto";

export const generateNewSecret = () => {
    return crypto.randomBytes(32).toString("hex");
};

export const SESSIONS_SECRET = generateNewSecret();
