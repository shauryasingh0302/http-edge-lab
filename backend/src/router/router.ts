import { HTTPRequest } from "../http/request.js";
import { HTTPResponse } from "../http/response.js";

type Handler = (request: HTTPRequest) => HTTPResponse;

export type Middleware = (
    request: HTTPRequest,
    next: () => HTTPResponse,
) => HTTPResponse;

export class Router {
    private routes: Map<string, Handler> = new Map();

    private middlewares: Middleware[] = [];

    use(middleware: Middleware) {
        this.middlewares.push(middleware);
    }

    get(path: string, handler: Handler) {
        this.routes.set(`GET ${path}`, handler);
    }

    post(path: string, handler: Handler) {
        this.routes.set(`POST ${path}`, handler);
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
                "Not Found",
            );
        }

        let index = 0;

        const next = (): HTTPResponse => {
            const middleware = this.middlewares[index++];
            if(!middleware) {
                return handler(request);
            }
            return middleware(request, next);
        };

        return next();
    }
}
