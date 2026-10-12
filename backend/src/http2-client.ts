import { connect } from "node:http2";

const client = connect("http://127.0.0.1:8081");

const startTime = Date.now();

let completedRequests = 0;

function sendRequest(path: string) {
    const request = client.request({
        ":path": path,
    });

    request.setEncoding("utf8");

    request.on("response", (headers) => {
        console.log(`Path: ${path}, Stream ID: ${request.id}`);
        console.log(`Status: ${headers[":status"]}`);
    });

    request.on("data", (chunk: string) => {
        process.stdout.write(chunk);
    });

    request.on("end", () => {
        console.log();
        console.log(`Elapsed: ${Date.now() - startTime}ms`);

        completedRequests++;

        if (completedRequests === 3) {
            client.close();
        }
    });

    request.end();
}

sendRequest("/hello");
sendRequest("/users");
sendRequest("/products");
