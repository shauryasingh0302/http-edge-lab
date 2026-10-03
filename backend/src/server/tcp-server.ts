import net from "node:net";
import { parseRequest } from "../http/parser.js";
import { HTTPResponse } from "../http/response.js";
import { serializeResponse } from "../http/serializer.js";
import { handleRequest } from "./request-handler.js";

const server = net.createServer((socket) => {
    console.log("client connected");

    socket.on("data", (data) => {
        const rawRequest = data.toString();
        const request = parseRequest(rawRequest);
        console.log(request);

        const response = handleRequest(request);
        
        socket.write(serializeResponse(response));

        socket.end();
    });

    socket.on("end", () => {
        console.log("client disconnected");
    });
});

server.listen(8080, () => {
    console.log("TCP server listening on port 8080");
});
