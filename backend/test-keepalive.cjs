const net = require("node:net");

const socket = net.createConnection({ host: "127.0.0.1", port: 8080 }, () => {
    const requests =
        "GET /about HTTP/1.1\r\n" +
        "Host: localhost\r\n" +
        "\r\n" +
        "GET /about HTTP/1.1\r\n" +
        "Host: localhost\r\n" +
        "Connection: close\r\n" +
        "\r\n";

    socket.write(requests);
});

socket.on("data", (data) => {
    process.stdout.write(data.toString());
});

socket.on("end", () => {
    console.log("\nConnection ended by server.");
});

socket.on("error", (error) => {
    console.error("Socket error:", error.message);
});
