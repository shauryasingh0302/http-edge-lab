import { HTTPRequest } from "../http/request.js";
import { HTTPResponse } from "../http/response.js";
import { Router } from "../router/router.js";

const router = new Router();

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

export function handleRequest(request: HTTPRequest): HTTPResponse {
    return router.handle(request);
}
