import { HTTPRequest } from "../http/request.js";
import { HTTPResponse } from "../http/response.js";

type Handler = (request: HTTPRequest) => HTTPResponse;

export class Router {
    private routes: Map<string, Handler> = new Map();

    get(path: string, handler: Handler) {
        this.routes.set(`GET ${path}`, handler);
    }

    handle(request: HTTPRequest): HTTPResponse {
        const key = `${request.method} ${request.path}`;

        const handler = this.routes.get(key);

        if (!handler) {
            return new HTTPResponse(
                404,
                {
                    "Content-Type": "text/plain",
                },
                "Not Found"
            );
        }

        return handler(request);
    }
}