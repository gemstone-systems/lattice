import websocket from "@fastify/websocket";
import Fastify from "fastify";

export const setupServer = async () => {
    const fastify = Fastify({
        logger: true,
    });

    await fastify.register(websocket);

    return fastify;
};
