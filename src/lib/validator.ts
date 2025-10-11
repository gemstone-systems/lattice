export function assertShardMessage(
    json: unknown,
): asserts json is ShardMessage {
    if (typeof json !== "object") {
        throw new Error("not a js object");
    }

    const candidate = json as Record<string, unknown>;

    if (candidate.type !== "shard/message") {
        throw new Error("Invalid type");
    }

    if (typeof candidate.text !== "string") {
        throw new Error("Invalid text");
    }

    const timestamp = new Date(candidate.timestamp as string);

    if (!(timestamp instanceof Date)) {
        throw new Error("Invalid timestamp");
    }
}

// example. we will use zod in the future.
export const validateShardMessage = (json: unknown) => {
    try {
        assertShardMessage(json);
        return { success: true, data: json };
    } catch (e: unknown) {
        return { error: e };
    }
};

export interface ShardMessage {
    type: "shard/message";
    text: string;
    timestamp: Date;
}
