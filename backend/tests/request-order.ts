import net from "node:net";

const socket = net.createConnection(8080, "localhost", () => {
    console.log("Connected");

    socket.write(
        "GET /static HTTP/1.1\r\n" +
        "Host: localhost:8080\r\n" +
        "\r\n" +

        "GET /about HTTP/1.1\r\n" +
        "Host: localhost:8080\r\n" +
        "\r\n"
    );
});

socket.on("data", (data) => {
    console.log("RESPONSE:");
    console.log(data.toString());
});

socket.on("close", () => {
    console.log("Connection closed");
});