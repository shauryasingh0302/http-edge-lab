const net = require("node:net");

const socket = net.createConnection(
    { host: "127.0.0.1", port: 8080 },
    () => {
        console.log("Connected to server");

        socket.write(
            "GET /about HTTP/1.1\r\n" +
            "Host: localhost\r\n\r\n",
        );

        socket.destroy();
        console.log("Client socket destroyed");
    },
);

socket.on("error", (error) => {
    console.log("Client socket error:", error.code);
});