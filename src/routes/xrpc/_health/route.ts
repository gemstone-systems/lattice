import type { Route } from "@/lib/types/routes";

export const healthRoute: Route = {
    method: "GET",
    handler: () => {
        return new Response("this lattice is running at 0.0.1", {
            headers: { "content-type": "text/plain; charset=utf-8" },
        });
    },
};
