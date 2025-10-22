import { SERVER_PORT } from "@/lib/env";
import { routes } from "@/routes";
import { setupServer } from "@/server";

const main = async () => {
    const server = await setupServer();
    for (const [url, route] of Object.entries(routes)) {
        if (!route.wsHandler) {
            const { handler, method } = route;
            server.route({
                url,
                method,
                handler,
            });
        } else {
            const { wsHandler, method, handler } = route;
            server.route({
                url,
                method: method ?? "GET",
                handler: handler ?? (() => new Response()),
                wsHandler,
            });
        }
    }

    server.listen({ port: SERVER_PORT }).catch((err: unknown) => {
        server.log.error(err);
        process.exit(1);
    });
};

main()
    .then(() => {
        console.log(`Server is running on port ${SERVER_PORT.toString()}`);
    })
    .catch((err: unknown) => {
        console.error("Something went wrong :(");
        console.error(
            "=========================== FULL ERROR BELOW ===========================",
        );
        console.error(err);
    });
