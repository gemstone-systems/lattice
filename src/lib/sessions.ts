import type { WebSocket } from "ws";
import * as crypto from "node:crypto";
import { SESSIONS_SECRET } from "@/lib/utils/crypto";
import type { Result } from "@/lib/utils/result";
import type { AtUri, Did } from "@/lib/types/atproto";
import { SERVER_PORT, SERVICE_DID } from "@/lib/env";
import type { LatticeSessionInfo } from "@/lib/types/handshake";

export const generateSessionId = () => {
    return crypto.randomUUID();
};

export const generateLatticeSessionInfo = (
    sessionId: string,
    allowedChannels: Array<AtUri>,
    clientDid: Did,
): LatticeSessionInfo => {
    const token = crypto.randomBytes(32).toString("base64url");

    const hmac = crypto.createHmac("sha256", SESSIONS_SECRET);
    hmac.update(`${token}:${sessionId}`);
    const fingerprint = hmac.digest("hex");

    const latticeDid: Did = SERVICE_DID.includes("localhost")
        ? `${SERVICE_DID}%3A${SERVER_PORT.toString()}`
        : SERVICE_DID;

    return {
        id: sessionId,
        token,
        fingerprint,
        allowedChannels,
        latticeDid,
        clientDid,
    };
};

export const verifyLatticeToken = ({
    token,
    fingerprint,
    id: sessionId,
}: LatticeSessionInfo) => {
    const hmac = crypto.createHmac("sha256", SESSIONS_SECRET);
    hmac.update(`${token}:${sessionId}`);
    const expectedFingerprint = hmac.digest("hex");

    try {
        return crypto.timingSafeEqual(
            Buffer.from(fingerprint, "hex"),
            Buffer.from(expectedFingerprint, "hex"),
        );
    } catch {
        return false;
    }
};

export const issuedLatticeTokens = new Map<string, LatticeSessionInfo>();

export const issueNewLatticeToken = ({
    allowedChannels,
    clientDid,
}: {
    allowedChannels: Array<AtUri | undefined>;
    clientDid: Did;
}) => {
    const filteredChannels = allowedChannels.filter(
        (channels) => channels !== undefined,
    );
    const sessionId = generateSessionId();
    const sessionInfo = generateLatticeSessionInfo(
        sessionId,
        filteredChannels,
        clientDid,
    );
    console.log("Issuing new handshake token with session info", sessionInfo);
    issuedLatticeTokens.set(sessionInfo.token, sessionInfo);
    return sessionInfo;
};

export const activeSessions = new Map<string, WebSocket>();

export const isValidSession = (sessionInfo: LatticeSessionInfo) => {
    return (
        issuedLatticeTokens.has(sessionInfo.token) &&
        verifyLatticeToken(sessionInfo)
    );
};

export const createNewSession = ({
    sessionInfo,
    socket,
}: {
    sessionInfo: LatticeSessionInfo;
    socket: WebSocket;
}): Result<{ sessionSocket: WebSocket }, undefined> => {
    try {
        issuedLatticeTokens.delete(sessionInfo.token);
    } catch {
        return { ok: false };
    }
    activeSessions.set(sessionInfo.id, socket);
    return { ok: true, data: { sessionSocket: socket } };
};

export const deleteSession = (
    sessionInfo: LatticeSessionInfo,
): Result<undefined, undefined> => {
    if (!activeSessions.has(sessionInfo.id)) return { ok: false };
    try {
        activeSessions.delete(sessionInfo.id);
    } catch {
        return { ok: false };
    }
    return { ok: true };
};
