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
        this.routes.set(`HEAD ${path}`, handler);
    }

    post(path: string, handler: Handler) {
        this.routes.set(`POST ${path}`, handler);
    }

    options(path: string, handler: Handler) {
        this.routes.set(`OPTIONS ${path}`, handler);
    }

    private matchRoute(
        routePath: string,
        requestPath: string,
    ): Record<string, string> | null {
        const routeParts = routePath.split("/").filter(Boolean);
        const requestParts = requestPath.split("/").filter(Boolean);

        if (routeParts.length !== requestParts.length) {
            return null;
        }

        const params: Record<string, string> = {};

        for (let i = 0; i < routeParts.length; i++) {
            const routePart = routeParts[i];
            const requestPart = requestParts[i];

            if (routePart.startsWith(":")) {
                const paramName = routePart.slice(1);
                params[paramName] = requestPart;
            } else if (routePart !== requestPart) {
                return null;
            }
        }

        return params;
    }

    handle(request: HTTPRequest): HTTPResponse {
        let handler: Handler | undefined;

        for (const [key, routeHandler] of this.routes) {
            const [method, routePath] = key.split(" ");

            if (method !== request.method) {
                continue;
            }

            const params = this.matchRoute(routePath, request.path);

            if (params !== null) {
                request.params = params;
                handler = routeHandler;
                break;
            }
        }

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
            if (!middleware) {
                return handler(request);
            }
            return middleware(request, next);
        };

        return next();
    }

    getAllowedMethods(path: string): string[] {
        const methods: string[] = [];

        for (const key of this.routes.keys()) {
            const [method, routePath] = key.split(" ");

            if (routePath === path) {
                methods.push(method);
            }
        }

        return methods;
    }
    
}
