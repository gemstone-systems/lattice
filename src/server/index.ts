import websocket from "@fastify/websocket";
import cors from "@fastify/cors";
import Fastify from "fastify";

export const setupServer = async () => {
    const fastify = Fastify({
        logger: true,
    });

    await fastify.register(cors, {
        origin: true,
    });

    await fastify.register(websocket);

    return fastify;
};
