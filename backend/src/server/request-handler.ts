import { HTTPRequest } from "../http/request.js";
import { HTTPResponse } from "../http/response.js";
import { Router } from "../router/router.js";
import { Middleware } from "../router/router.js";
import { createReadStream, statSync } from "node:fs";
import path from "node:path";

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

router.get("/cookie", (request) => {
    const sessionId = request.cookies.sessionId;

    const body = `Session: ${sessionId}`;

    return new HTTPResponse(
        200,
        {
            "Content-Type": "text/plain",
            "Content-Length": Buffer.byteLength(body).toString(),
        },
        body,
    );
});

router.get("/", () => {
    const body = "Hello from our HTTP server!";

    return new HTTPResponse(
        200,
        {
            "Content-Type": "text/plain",
            "Content-Length": Buffer.byteLength(body).toString(),
            "Set-Cookie": ["sessionId=abc123", "theme=dark"],
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

router.post("/users/create", () => {
    const body = "User created";

    return new HTTPResponse(
        201,
        {
            "Content-Type": "text/plain",
            "Content-Length": Buffer.byteLength(body).toString(),
        },
        body,
    );
});

router.get("/chunked", () => {
    return new HTTPResponse(
        200,
        {
            "Content-Type": "text/plain",
        },
        "",
        true,
        ["Hello", " from", " chunked", " streaming!"],
    );
});

router.get("/static/:filename", (request) => {
    const publicDir = path.resolve("public");
    const filename = decodeURIComponent(request.params.filename);
    const filePath = path.resolve(publicDir, filename);
    const relativePath = path.relative(publicDir, filePath);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        return new HTTPResponse(
            403,
            {
                "Content-Type": "text/plain",
            },
            "Forbidden",
        );
    }

    let fileSize: number;

    try {
        fileSize = statSync(filePath).size;
    } catch {
        return new HTTPResponse(
            404,
            {
                "Content-Type": "text/plain",
            },
            "Not Found",
        );
    }
    
    const stream = createReadStream(filePath);

    return new HTTPResponse(
        200,
        {
            "Content-Type": "text/plain",
            "Content-Length": fileSize.toString(),
        },
        undefined,
        false,
        undefined,
        stream,
    );
});

export function handleRequest(request: HTTPRequest): HTTPResponse {
    return router.handle(request);
}
