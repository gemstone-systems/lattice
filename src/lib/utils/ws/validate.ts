import type { WebsocketMessage } from "@/lib/types/messages";
import { websocketMessageSchema } from "@/lib/types/messages";
import type { Result } from "@/lib/utils/result";
import { z } from "zod";
import type { RawData } from "ws";

export const rawDataToString = (data: RawData): string => {
    if (Buffer.isBuffer(data)) {
        return data.toString("utf-8");
    }
    if (Array.isArray(data)) {
        return Buffer.concat(data).toString("utf-8");
    }
    return new TextDecoder().decode(data);
};

export const validateWsMessageString = (
    data: unknown,
): Result<string, unknown> => {
    const { success, error, data: message } = z.string().safeParse(data);
    if (!success) {
        console.error("Error decoding websocket message");
        console.error(error);
        return { ok: false, error: z.treeifyError(error) };
    }
    return { ok: true, data: message };
};

export const validateWsMessageType = (
    data: unknown,
): Result<WebsocketMessage, unknown> => {
    const {
        success: wsMessageSuccess,
        error: wsMessageError,
        data: wsMessage,
    } = websocketMessageSchema.safeParse(data);
    if (!wsMessageSuccess) {
        console.error(
            "Error parsing websocket message. The data might be the wrong shape.",
        );
        console.error(wsMessageError);
        return { ok: false, error: z.treeifyError(wsMessageError) };
    }
    return { ok: true, data: wsMessage };
};
