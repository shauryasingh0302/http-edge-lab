export class HTTPRequest {
    method: string;
    path: string;
    version: string;
    headers: Record<string, string>;
    body: string;
    query: Record<string, string>;
    cookies: Record<string, string>;

    constructor(
        method: string,
        path: string,
        version: string,
        headers: Record<string, string>,
        body: string,
        query: Record<string, string>,
        cookies: Record<string, string>,
    ){
        this.method = method;
        this.path = path;
        this.version = version;
        this.headers = headers;
        this.body = body;
        this.query = query;
        this.cookies = cookies;
    }
}