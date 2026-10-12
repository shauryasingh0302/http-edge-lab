
const net = require("node:net");

const socket = net.createConnection(
    { host: "127.0.0.1", port: 8080 },
    () => {
        socket.write(
            "THIS IS NOT A VALID HTTP REQUEST\r\n" +
            "Host: localhost\r\n" +
            "\r\n",
        );
    },
);

socket.on("data", (data) => {
    process.stdout.write(data.toString());
});

socket.on("end", () => {
    console.log("\nConnection ended by server.");
});

socket.on("error", (error) => {
    console.error("Socket error:", error.message);
});
