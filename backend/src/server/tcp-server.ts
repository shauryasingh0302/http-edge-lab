import net from "node:net";
import { parseRequest } from "../http/parser.js";
import { HTTPResponse } from "../http/response.js";
import { serializeResponse } from "../http/serializer.js";
import { handleRequest } from "./request-handler.js";

const server = net.createServer((socket) => {
    console.log("client connected");

    let buffer = "";

    socket.on("data", (data) => {
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

            if(buffer.length<requestLength){
                break;
            }

            const rawRequest = buffer.slice(0, requestLength);

            buffer = buffer.slice(requestLength);

            try {
                const request = parseRequest(rawRequest);
                console.log(request);
                const response = handleRequest(request);
                socket.write(serializeResponse(response));
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

    socket.on("end", () => {
        console.log("client disconnected");
    });
});

server.listen(8080, () => {
    console.log("TCP server listening on port 8080");
});
