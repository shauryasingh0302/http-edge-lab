import type { Socket } from "node:net";
import { STATUS_CODES } from "node:http";
import { HTTPResponse } from "./response.js";

function encodeChunk(body: string): string {
    const size = Buffer.byteLength(body).toString(16);

    return `${size}\r\n${body}\r\n`;
}

export function serializeResponse(response: HTTPResponse): string {
    const statusMessage = STATUS_CODES[response.statusCode] ?? "Unknown";
    let responseText = `HTTP/1.1 ${response.statusCode} ${statusMessage}\r\n`;
    if (response.chunked) {
        response.headers["Transfer-Encoding"] = "chunked";
    }
    for (const [key, value] of Object.entries(response.headers)) {
        if (Array.isArray(value)) {
            for (const item of value) {
                responseText += `${key}: ${item}\r\n`;
            }
        } else {
            responseText += `${key}: ${value}\r\n`;
        }
    }
    responseText += "\r\n";

    if (response.chunked) {
        const chunks = response.chunks ?? [response.body ?? ""];
        for (const chunk of chunks) {
            responseText += encodeChunk(chunk);
        }
        responseText += "0\r\n\r\n";
    } else {
        responseText += response.body;
    }

    return responseText;
}

export async function writeChunkedResponse(
    socket: Socket,
    response: HTTPResponse,
) {
    const statusMessage = STATUS_CODES[response.statusCode] ?? "Unknown";

    let headers = `HTTP/1.1 ${response.statusCode} ${statusMessage}\r\n`;

    for (const [key, value] of Object.entries(response.headers)) {
        if (key.toLowerCase() === "content-length") {
            continue;
        }
        if (Array.isArray(value)) {
            for (const item of value) {
                headers += `${key}: ${item}\r\n`;
            }
        } else {
            headers += `${key}: ${value}\r\n`;
        }
    }

    headers += "Transfer-Encoding: chunked\r\n";
    headers += "\r\n";

    socket.write(headers);

    const chunks = response.chunks ?? [response.body ?? ""];

    for (const chunk of chunks) {
        socket.write(encodeChunk(chunk));
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    socket.write("0\r\n\r\n");
}

export async function writeStreamResponse(
    socket: Socket,
    response: HTTPResponse,
) {
    const statusMessage = STATUS_CODES[response.statusCode] ?? "Unknown";

    let headers = `HTTP/1.1 ${response.statusCode} ${statusMessage}\r\n`;

    for (const [key, value] of Object.entries(response.headers)) {
        if (Array.isArray(value)) {
            for (const item of value) {
                headers += `${key}: ${item}\r\n`;
            }
        } else {
            headers += `${key}: ${value}\r\n`;
        }
    }
    headers += "\r\n";
    socket.write(headers);

    for await (const chunk of response.stream!) {
        const canContinue = socket.write(chunk);
        if (!canContinue) {
            await new Promise<void>((resolve) => {
                socket.once("drain", resolve);
            });
        }
    }
}

export async function writeGzipResponse(
    socket: Socket,
    response: HTTPResponse,
) {
    const statusMessage = STATUS_CODES[response.statusCode] ?? "Unknown";

    let headers = `HTTP/1.1 ${response.statusCode} ${statusMessage}\r\n`;

    for (const [key, value] of Object.entries(response.headers)) {
        if (
            key.toLowerCase() === "content-length" ||
            key.toLowerCase() === "transfer-encoding"
        ) {
            continue;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                headers += `${key}: ${item}\r\n`;
            }
        } else {
            headers += `${key}: ${value}\r\n`;
        }
    }

    headers += "Transfer-Encoding: chunked\r\n";
    headers += "\r\n";

    socket.write(headers);

    for await (const chunk of response.stream!) {
        const size = Buffer.byteLength(chunk).toString(16);
        const chunkHeader = `${size}\r\n`;
        const chunkFooter = "\r\n";

        socket.write(chunkHeader);
        socket.write(chunk);
        socket.write(chunkFooter);
    }
    socket.write("0\r\n\r\n");
}
