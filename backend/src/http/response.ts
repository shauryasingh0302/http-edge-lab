export class HTTPResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;

    constructor(
        statusCode: number,
        headers: Record<string, string>,
        body: string
    ) {
        this.statusCode = statusCode;
        this.headers = headers;
        this.body = body;
    }
}