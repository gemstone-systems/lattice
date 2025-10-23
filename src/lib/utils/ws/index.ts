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
