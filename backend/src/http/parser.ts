import { HTTPRequest } from "./request";

export function parseRequest(rawRequest: string) {
    const [head] = rawRequest.split("\r\n\r\n");

    const lines = head.split("\r\n");

    const [method, path, version] = lines[0].split(" ");

    const headers: Record<string, string> = {};

    for (let i = 1; i < lines.length; i++) {
        const [key, ...value] = lines[i].split(":");

        headers[key.toLowerCase()] = value.join(":").trim();
    }

    return new HTTPRequest(method, path, version, headers);
    
}
