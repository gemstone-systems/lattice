import { rawDataToString } from "@/lib/utils";
import { validateShardMessage, type ShardMessage } from "@/lib/validator";
import type { RawData } from "ws";
import WebSocket from "ws";

const wss = new WebSocket.Server({ port: 8080 });

const messages: ShardMessage[] = []; // Store message history
const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
    clients.add(ws);

    // Send history to new client
    ws.send(
        JSON.stringify({
            type: "shard/history",
            messages: messages,
        }),
    );

    ws.on("message", (data: RawData) => {
        const jsonText = rawDataToString(data);
        const jsonData: unknown = JSON.parse(jsonText);
        const {
            success,
            error,
            data: shardMessage,
        } = validateShardMessage(jsonData);

        if (!success) {
            console.log(error);
        } else {
            messages.push(shardMessage);
        }

        clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(shardMessage));
            }
        });
    });

    ws.on("close", () => {
        clients.delete(ws);
    });
});

console.log("Server running on ws://localhost:8080");
