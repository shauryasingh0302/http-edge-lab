import { HTTPRequest } from "../http/request.js";
import { HTTPResponse } from "../http/response.js";
import { Router } from "../router/router.js";
import { Middleware } from "../router/router.js";

const router = new Router();

const logger: Middleware = (request, next) => {
    console.log(`${request.method} ${request.path}`);
    return next();
};

router.use(logger);

const timer: Middleware = (request, next) => {
    const start = Date.now();

    const response = next();

    console.log(`Request took ${Date.now() - start}ms`);

    return response;
};

router.use(timer);

router.get("/", () => {
    const body = "Hello from our HTTP server!";

    return new HTTPResponse(
        200,
        {
            "Content-Type": "text/plain",
            "Content-Length": Buffer.byteLength(body).toString(),
        },
        body,
    );
});

router.get("/about", () => {
    const body = "This is the About page";

    return new HTTPResponse(
        200,
        {
            "Content-Type": "text/plain",
            "Content-Length": Buffer.byteLength(body).toString(),
        },
        body,
    );
});

router.get("/users", (request) => {
    const name = request.query.name;
    const body = `Hello ${name}`;

    return new HTTPResponse(
        200,
        {
            "Content-Type": "text/plain",
            "Content-Length": Buffer.byteLength(body).toString(),
        },
        body,
    );
});

router.post("/users", (request) => {
    const body = request.body;
    return new HTTPResponse(
        200,
        {
            "Content-Type": "text/plain",
            "Content-Length": Buffer.byteLength(body).toString(),
        },
        body,
    );
});

export function handleRequest(request: HTTPRequest): HTTPResponse {
    return router.handle(request);
}
