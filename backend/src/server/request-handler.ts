import { HTTPRequest } from "../http/request.js";
import { HTTPResponse } from "../http/response.js";

export function handleRequest(request: HTTPRequest): HTTPResponse {
    const body = "Hello from our HTTP server!";

    return new HTTPResponse(
        200,
        {
            "Content-Type": "text/plain",
            "Content-Length": Buffer.byteLength(body).toString(),
        },
        body
    );
}