import net from "node:net";
import tls from "node:tls";
import { readFileSync } from "node:fs";
import { parseRequest } from "../http/parser.js";
import { HTTPResponse } from "../http/response.js";
import {
    serializeResponse,
    writeChunkedResponse,
    writeStreamResponse,
    writeGzipResponse,
} from "../http/serializer.js";
import { handleRequest } from "./request-handler.js";

const tlsOptions = {
    key: readFileSync("certs/key.pem"),
    cert: readFileSync("certs/cert.pem"),
};

const handleConnection = (socket: net.Socket) => {
    console.log("client connected");
    socket.setTimeout(30_000);

    let buffer = "";

    let requestQueue = Promise.resolve();

    const processRequest = async (rawRequest: string) => {
        try {
            const request = parseRequest(rawRequest);
            const shouldClose =
                request.headers["connection"]?.toLowerCase() === "close";
            console.log(request);
            const response = handleRequest(request);
            response.headers["Connection"] = shouldClose
                ? "close"
                : "keep-alive";

            if (response.headers["Content-Encoding"] === "gzip") {
                await writeGzipResponse(socket, response);
            } else if (response.stream) {
                await writeStreamResponse(socket, response);
            } else if (response.chunked) {
                await writeChunkedResponse(socket, response);
            } else {
                socket.write(serializeResponse(response));
            }

            if (shouldClose) {
                socket.end();
            }
        } catch {
            const response = new HTTPResponse(
                400,
                {
                    "Content-Type": "text/plain",
                },
                "Bad Request",
            );
            socket.write(serializeResponse(response));
        }
    };

    socket.on("data", async (data) => {
        buffer += data.toString();

        while (true) {
            const headerEnd = buffer.indexOf("\r\n\r\n");

            if (headerEnd === -1) {
                break;
            }

            const header = buffer.slice(0, headerEnd);
            const body = buffer.slice(headerEnd + 4);

            const contentLengthMatch = header.match(/Content-Length:\s*(\d+)/i);
            const contentLength = contentLengthMatch
                ? Number(contentLengthMatch[1])
                : 0;

            const requestLength = headerEnd + 4 + contentLength;

            if (buffer.length < requestLength) {
                break;
            }

            const rawRequest = buffer.slice(0, requestLength);

            buffer = buffer.slice(requestLength);

            requestQueue = requestQueue.then(() => processRequest(rawRequest));
        }
    });

    socket.on("close", () => {
        console.log("TCP connection closed");
    });

    socket.on("timeout", () => {
        console.log("socket timeout");
        socket.end();
    });

    socket.on("end", () => {
        console.log("client disconnected");
    });
};

const server = net.createServer(handleConnection);

const httpsServer = tls.createServer(tlsOptions, handleConnection);

server.listen(8080, () => {
    console.log("TCP server listening on port 8080");
});

httpsServer.listen(8443, () => {
    console.log("HTTPS server listening on port 8443");
});

process.on("SIGINT", () => {
    console.log("Shutting down server...");

    const forceShutdown = setTimeout(() => {
        console.log("Forcefully shutting down...");
        process.exit(0);
    }, 5000);

    server.close(() => {
        clearTimeout(forceShutdown);
        console.log("Server closed");
        process.exit(0);
    });
});
