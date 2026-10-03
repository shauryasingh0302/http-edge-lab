import net from "node:net";
import { parseRequest } from "../http/parser.js";
import { HTTPResponse } from "../http/response.js";
import { serializeResponse, writeChunkedResponse } from "../http/serializer.js";
import { handleRequest } from "./request-handler.js";

const server = net.createServer((socket) => {
    console.log("client connected");
    socket.setTimeout(30_000);

    let buffer = "";

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

            try {
                const request = parseRequest(rawRequest);
                const shouldClose =
                    request.headers["connection"]?.toLowerCase() === "close";
                console.log(request);
                const response = handleRequest(request);
                response.headers["Connection"] = shouldClose
                    ? "close"
                    : "keep-alive";
                if (response.chunked) {
                    await writeChunkedResponse(socket, response);
                } else {
                    socket.write(serializeResponse(response));
                }
                if (shouldClose) {
                    socket.end();
                    break;
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
});

server.listen(8080, () => {
    console.log("TCP server listening on port 8080");
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
