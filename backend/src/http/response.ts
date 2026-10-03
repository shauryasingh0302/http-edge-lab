export class HTTPResponse {
    statusCode: number;
    headers: Record<string, string | string[]>;
    body: string;
    chunked: boolean;
    chunks?: string[];

    constructor(
        statusCode: number,
        headers: Record<string, string | string[]>,
        body: string,
        chunked = false,
        chunks?: string[],
    ) {
        this.statusCode = statusCode;
        this.headers = headers;
        this.body = body;
        this.chunked = chunked;
        this.chunks = chunks;
    }
}
