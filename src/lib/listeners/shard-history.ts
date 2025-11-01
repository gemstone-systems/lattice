import { clientSessions } from "@/lib/sessions";
import { historyMessageSchema } from "@/lib/types/messages";
import {
    rawDataToString,
    validateWsMessageType,
} from "@/lib/utils/ws/validate";
import type WebSocket from "ws";
import { z } from "zod";

export const attachHistoryFromShardListener = (socket: WebSocket) => {
    socket.on("message", (rawData) => {
        const event = rawDataToString(rawData);

        const data: unknown = JSON.parse(event);
        const validateTypeResult = validateWsMessageType(data);
        if (!validateTypeResult.ok) return;

        console.log("received", validateTypeResult.data, "from shard")

        const { type: messageType } = validateTypeResult.data;
        if (messageType !== "shard/history") return;
        const {
            success,
            error,
            data: historyMessage,
        } = historyMessageSchema.safeParse(validateTypeResult.data);
        if (!success) {
            console.error(
                "could not parse",
                validateTypeResult.data,
                "as a valid history message.",
            );
            console.error(z.treeifyError(error));
            return;
        }
        const { forClient: intendedRecipient } = historyMessage;
        const clientSessionInfo = clientSessions
            .keys()
            .find((sessionInfo) => sessionInfo.clientDid === intendedRecipient);
        if (!clientSessionInfo) {
            console.error("Could not client session info in sessions map.");
            return;
        }
        const clientSocket = clientSessions.get(clientSessionInfo);
        if (!clientSocket) {
            console.error(
                "Could find session info in map but somehow couldn't find socket? This should not happen.",
            );
            return;
        }
        clientSocket.send(JSON.stringify(historyMessage));
        console.log("sent off", historyMessage, "to client")
    });
};
