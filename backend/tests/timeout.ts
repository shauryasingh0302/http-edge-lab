import net from "node:net";

const socket = net.createConnection(8080, "localhost", () => {
    console.log("TCP connection established");
});

socket.on("end", () => {
    console.log("Server closed the connection");
});

socket.on("close", () => {
    console.log("TCP connection closed");
});