import { HTTPRequest } from "../http/request.js";
import { HTTPResponse } from "../http/response.js";
import { Router } from "../router/router.js";
import { Middleware } from "../router/router.js";
import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import { createGzip } from "node:zlib";

const mimeTypes: Record<string, string> = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".txt": "text/plain",
};

const router = new Router();

const logger: Middleware = (request, next) => {
    console.log(`${request.method} ${request.path}`);
    console.log("Origin:", request.headers["origin"]);
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

const cors: Middleware = (request, next) => {
    const response = next();

    const allowedOrigins = ["http://localhost:3000"];

    const origin = request.headers["origin"];

    const requestedMethod = request.headers["access-control-request-method"];

    const allowedHeaders = ["content-type", "authorization"];

    const requestedHeaders =
        request.headers["access-control-request-headers"]
            ?.split(",")
            .map((header) => header.trim().toLowerCase()) ?? [];

    const headersAllowed = requestedHeaders.every((header) =>
        allowedHeaders.includes(header),
    );

    if (requestedHeaders.length > 0 && headersAllowed) {
        response.headers["Access-Control-Allow-Headers"] =
            requestedHeaders.join(", ");
    }

    if (origin && allowedOrigins.includes(origin)) {
        response.headers["Access-Control-Allow-Origin"] = origin;
        response.headers["Access-Control-Allow-Credentials"] = "true";
        response.headers["Vary"] = "Origin";
        
        if (requestedMethod) {
            const allowedMethods = router.getAllowedMethods(request.path);

            if (allowedMethods.includes(requestedMethod)) {
                response.headers["Access-Control-Allow-Methods"] =
                    requestedMethod;
            }
        }
    }

    return response;
};

router.use(cors);

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

    const extension = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extension] ?? "application/octet-stream";
    const acceptEncoding = request.headers["accept-encoding"];

    const range = request.headers["range"];

    const encodings =
        acceptEncoding?.split(",").map((encoding) => {
            const parts = encoding.trim().split(";");

            const name = parts[0];

            const q = parts.find((part) => part.trim().startsWith("q="));

            const quality = q ? Number(q.split("=")[1]) : 1;

            return { name, quality };
        }) ?? [];

    const gzipEncoding = encodings.find((encoding) => encoding.name === "gzip");

    const wildcardEncoding = encodings.find(
        (encoding) => encoding.name === "*",
    );

    const supportsGzip = gzipEncoding
        ? gzipEncoding.quality > 0
        : wildcardEncoding
          ? wildcardEncoding.quality > 0
          : false;

    const shouldGzip =
        supportsGzip &&
        request.method === "GET" &&
        !range &&
        contentType.startsWith("text/");

    let fileSize: number;
    let etag;
    let lastModified;

    try {
        const fileStats = statSync(filePath);
        fileSize = fileStats.size;
        etag = `"${fileStats.size}-${fileStats.mtimeMs}"`;
        lastModified = fileStats.mtime.toUTCString();
        const ifNoneMatch = request.headers["if-none-match"];

        const ifModifiedSince = request.headers["if-modified-since"];

        if (ifModifiedSince === lastModified) {
            return new HTTPResponse(304, {
                ETag: etag,
                "Last-Modified": lastModified,
            });
        }

        if (ifNoneMatch === etag) {
            return new HTTPResponse(304, {
                ETag: etag,
            });
        }
    } catch {
        return new HTTPResponse(
            404,
            {
                "Content-Type": "text/plain",
            },
            "Not Found",
        );
    }

    let start = 0;
    let end = fileSize - 1;

    if (range) {
        const match = range.match(/^bytes=(\d*)-(\d*)$/);

        if (!match || (!match[1] && !match[2])) {
            return new HTTPResponse(
                416,
                {
                    "Content-Type": "text/plain",
                    "Content-Range": `bytes */${fileSize}`,
                },
                "Range Not Satisfiable",
            );
        }

        if (!match[1]) {
            const suffixLength = Number(match[2]);

            if (suffixLength === 0) {
                return new HTTPResponse(
                    416,
                    {
                        "Content-Type": "text/plain",
                        "Content-Range": `bytes */${fileSize}`,
                    },
                    "Range Not Satisfiable",
                );
            }

            start = Math.max(fileSize - suffixLength, 0);
            end = fileSize - 1;
        } else {
            start = Number(match[1]);

            if (match[2]) {
                end = Number(match[2]);
            } else {
                end = fileSize - 1;
            }
        }

        if (start >= fileSize || start > end) {
            return new HTTPResponse(
                416,
                {
                    "Content-Type": "text/plain",
                    "Content-Range": `bytes */${fileSize}`,
                },
                "Range Not Satisfiable",
            );
        }

        end = Math.min(end, fileSize - 1);
    }

    const fileStream = createReadStream(filePath, { start, end });

    const stream =
        request.method === "HEAD"
            ? undefined
            : shouldGzip
              ? fileStream.pipe(createGzip())
              : fileStream;

    return new HTTPResponse(
        range ? 206 : 200,
        {
            "Content-Type": contentType,
            ...(shouldGzip
                ? {}
                : {
                      "Content-Length": (end - start + 1).toString(),
                  }),
            ETag: etag,
            "Last-Modified": lastModified,
            "Cache-Control": "public, max-age=3600",
            ...(shouldGzip
                ? {
                      "Content-Encoding": "gzip",
                      "Transfer-Encoding": "chunked",
                      Vary: "Accept-Encoding",
                  }
                : {}),
            ...(range
                ? { "Content-Range": `bytes ${start}-${end}/${fileSize}` }
                : {}),
        },
        undefined,
        false,
        undefined,
        stream,
    );
});

router.get("/download/:filename", (request) => {
    const filename = decodeURIComponent(request.params.filename);
    if (filename.includes("\r") || filename.includes("\n")) {
        return new HTTPResponse(
            400,
            {
                "Content-Type": "text/plain",
            },
            "Invalid filename",
        );
    }
    const publicDir = path.resolve("public");
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
        const fileStats = statSync(filePath);
        fileSize = fileStats.size;
    } catch {
        return new HTTPResponse(
            404,
            {
                "Content-Type": "text/plain",
            },
            "Not Found",
        );
    }

    const fileStream = createReadStream(filePath);

    return new HTTPResponse(
        200,
        {
            "Content-Type": "application/octet-stream",
            "Content-Length": fileSize.toString(),
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
        undefined,
        false,
        undefined,
        fileStream,
    );
});

router.delete("/users/:id", (request) => {
    const id = request.params.id;

    return new HTTPResponse(
        200,
        {
            "Content-Type": "text/plain",
            "Content-Length": Buffer.byteLength(
                `User ${id} deleted`,
            ).toString(),
        },
        `User ${id} deleted`,
    );
});

router.put("/users/:id", (request) => {
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

router.patch("/users/:id", (request) => {
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
