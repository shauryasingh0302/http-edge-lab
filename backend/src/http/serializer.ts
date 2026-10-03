import { STATUS_CODES } from "node:http";
import { HTTPResponse } from "./response.js";

export function serializeResponse(response: HTTPResponse): string {
    const statusMessage = STATUS_CODES[response.statusCode] ?? "Unknown";
    let responseText = `HTTP/1.1 ${response.statusCode} ${statusMessage}\r\n`;
    for (const [key, value] of Object.entries(response.headers)) {
        responseText += `${key}: ${value}\r\n`;
    }
    responseText += "\r\n";
    responseText += response.body;

    return responseText;
}
