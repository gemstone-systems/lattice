import type {
    FastifyReply,
    FastifyRequest,
    HookHandlerDoneFunction,
} from "fastify";
import type { WebSocket } from "ws";

export type RouteHandler = (
    req: FastifyRequest,
    reply: FastifyReply,
) => Response | Promise<Response>;

export type PreHandler = (
    req: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction,
) => void;

export type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface Route {
    method: Method;
    handler: RouteHandler;
    wsHandler?: undefined;
    skipRegistrationCheck?: true;
}

export type WsRouteHandler = (socket: WebSocket, req: FastifyRequest) => void;

export interface WsRoute {
    method?: Method;
    handler?: RouteHandler;
    wsHandler: WsRouteHandler;
    preHandler?: PreHandler;
    skipRegistrationCheckHttp?: true;
    skipRegistrationCheckWs?: true;
}
