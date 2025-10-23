// Prism is a jetstream/jetstream-compatible fork for receiving filtered events from the firehose
import { PRISM_URL } from "@/lib/env";
import WebSocket from "ws";

export const connectToPrism = (opts?: {
    wantedCollections?: Array<string>;
    wantedDids?: Array<string>;
    cursor?: number;
}) => {
    const endpoint = PRISM_URL;
    if (opts) {
        const { wantedCollections, wantedDids, cursor } = opts;
        if (wantedCollections)
            wantedCollections.forEach((collection) => {
                endpoint.searchParams.append("wantedCollections", collection);
            });
        if (wantedDids)
            wantedDids.forEach((did) => {
                endpoint.searchParams.append("wantedDids", did);
            });
        if (cursor) endpoint.searchParams.append("cursor", cursor.toString());
    }
    return new WebSocket(endpoint);
};
