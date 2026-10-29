import {
    setCachedResponse,
    getCachedResponse,
    clearResponseCache,
} from "../src/cache/response-cache.js";

import { HTTPResponse } from "../src/http/response.js";

function createResponse(body: string): HTTPResponse {
    return new HTTPResponse(200, {}, body);
}

clearResponseCache();

setCachedResponse("/a", createResponse("A"));
setCachedResponse("/b", createResponse("B"));

// Refresh /a so it becomes the newest entry.
setCachedResponse("/a", createResponse("A-updated"));

// Insert /c; /b should now be evicted.
setCachedResponse("/c", createResponse("C"));

console.log("A:", getCachedResponse("/a")?.body);
console.log("B:", getCachedResponse("/b")?.body);
console.log("C:", getCachedResponse("/c")?.body);