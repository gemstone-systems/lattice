import type { ShardMessage } from "@/lib/types/messages";
import { rawDataToString } from "@/lib/utils";
import { validateNewMessage } from "@/lib/validators";
import type { RawData } from "ws";
import WebSocket from "ws";

const wss = new WebSocket.Server({ port: 8080 });

const messages: ShardMessage[] = [];
const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
    clients.add(ws);

    ws.send(
        JSON.stringify({
            type: "shard/history",
            messages: messages,
        }),
    );

    ws.on("message", (data: RawData) => {
        const jsonText = rawDataToString(data);
        const jsonData: unknown = JSON.parse(jsonText);

        const shardMessage = validateNewMessage(jsonData);
        if (!shardMessage) return;

        messages.push(shardMessage);

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
