import { createServer } from "node:http2";

const server = createServer();

server.on("request", (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    const delay = url.pathname === "/hello" ? 2000 : 0;

    setTimeout(() => {
        let body: string;

        if (url.pathname === "/users") {
            const name = url.searchParams.get("name");
            body = `Hello ${name}`;
        } else {
            body =
                `Hello from HTTP/2!\n` +
                `Path: ${request.url}\n` +
                `Delay: ${delay}ms\n`;
        }

        response.writeHead(200, {
            "content-type": "text/plain; charset=utf-8",
            "content-length": Buffer.byteLength(body).toString(),
        });

        response.end(body);
    }, delay);
});

server.listen(8081, "127.0.0.1", () => {
    console.log("HTTP/2 server listening on port 8081");
});
