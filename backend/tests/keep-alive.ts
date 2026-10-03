import net from "node:net";

const socket = net.createConnection(8080, "localhost", () => {
    console.log("TCP connection established");

    socket.write(
        "GET / HTTP/1.1\r\n" +
        "Host: localhost:8080\r\n" +
        "\r\n"
    );
});

let responseCount = 0;

socket.on("data", (data: Buffer) => {
    console.log("Response received:");
    console.log(data.toString());

    responseCount++;

    if (responseCount === 1) {
        socket.write(
            "GET /about HTTP/1.1\r\n" +
            "Host: localhost:8080\r\n" +
            "\r\n"
        );
    }

    if (responseCount === 2) {
        socket.end();
    }
});