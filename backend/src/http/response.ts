import type { Readable } from "node:stream";

export class HTTPResponse {
    statusCode: number;
    headers: Record<string, string | string[]>;
    body?: string;
    chunked: boolean;
    chunks?: string[];
    stream?: Readable;

    constructor(
        statusCode: number,
        headers: Record<string, string | string[]>,
        body?: string,
        chunked = false,
        chunks?: string[],
        stream?: Readable,
    ) {
        this.statusCode = statusCode;
        this.headers = headers;
        this.body = body;
        this.chunked = chunked;
        this.chunks = chunks;
        this.stream = stream;
    }
}
