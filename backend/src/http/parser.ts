import { HTTPRequest } from "./request";

export function parseRequest(rawRequest: string) {
    const [head, body = ""] = rawRequest.split("\r\n\r\n");

    const lines = head.split("\r\n");

    const [method, path, version] = lines[0].split(" ");

    if(!method || !path || !version){
        throw new Error("Malformed request line")
    }

    const headers: Record<string, string> = {};

    const url = new URL(path, "http://localhost");
    const query: Record<string, string> = {};

    for (const [key, value] of url.searchParams) {
        query[key] = value;
    }

    for (let i = 1; i < lines.length; i++) {
        const [key, ...value] = lines[i].split(":");

        headers[key.toLowerCase()] = value.join(":").trim();
    }

    const cookies: Record<string, string> = {};

    const cookieHeader = headers["cookie"];

    if (cookieHeader) {
        for (const cookie of cookieHeader.split(";")) {
            const [key, ...value] = cookie.trim().split("=");

            cookies[key] = value.join("=");
        }
    }

    return new HTTPRequest(
        method,
        url.pathname,
        version,
        headers,
        body,
        query,
        cookies,
    );
}
