import {
    historyMessageSchema,
    shardMessageSchema,
    websocketMessageSchema,
} from "@/lib/types/messages";
import { z } from "zod";

export const validateWsMessageString = (data: unknown) => {
    const { success, error, data: message } = z.string().safeParse(data);
    if (!success) {
        console.error("Error decoding websocket message");
        console.error(error);
        return;
    }
    return message;
};

export const validateWsMessageType = (data: unknown) => {
    const {
        success: wsMessageSuccess,
        error: wsMessageError,
        data: wsMessage,
    } = websocketMessageSchema.loose().safeParse(data);
    if (!wsMessageSuccess) {
        console.error(
            "Error parsing websocket message. The data might be the wrong shape.",
        );
        console.error(wsMessageError);
        return;
    }
    return wsMessage;
};

export const validateHistoryMessage = (data: unknown) => {
    const {
        success: historySuccess,
        error: historyError,
        data: history,
    } = historyMessageSchema.safeParse(data);
    if (!historySuccess) {
        console.error(
            "History message schema parsing failed. Did your type drift?",
        );
        console.error(historyError);
        return;
    }
    return history;
};

export const validateNewMessage = (data: unknown) => {
    const {
        success: messageSuccess,
        error: messageError,
        data: message,
    } = shardMessageSchema.safeParse(data);
    if (!messageSuccess) {
        console.error(
            "New message schema parsing failed. Did your type drift?",
        );
        console.error(messageError);
        return;
    }
    return message;
};
