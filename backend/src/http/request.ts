export class HTTPRequest {
    method: string;
    path: string;
    version: string;
    headers: Record<string, string>;

    constructor(
        method: string,
        path: string,
        version: string,
        headers: Record<string, string>
    ){
        this.method = method;
        this.path = path;
        this.version = version;
        this.headers = headers;
    }
}