import { createServer } from "node:http2";

const server = createServer();

server.on("request", (request, response) => {
    const delay = request.url === "/hello" ? 2000 : 0;

    setTimeout(() => {
        response.writeHead(200, {
            "content-type": "text/plain; charset=utf-8",
        });

        response.end(
            `Hello from HTTP/2!\n` +
                `Path: ${request.url}\n` +
                `Delay: ${delay}ms\n`,
        );
    }, delay);
});

server.listen(8081, "127.0.0.1", () => {
    console.log("HTTP/2 server listening on port 8081");
});
