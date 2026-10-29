import { HTTPResponse } from "../http/response.js";

type CacheEntry = {
    response: HTTPResponse;
    expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

const MAX_CACHE_ENTRIES = 100;

function copyHeaders(
    headers: Record<string, string | string[]>,
): Record<string, string | string[]> {
    return Object.fromEntries(
        Object.entries(headers).map(([key, value]) => [
            key,
            Array.isArray(value) ? [...value] : value,
        ]),
    );
}

export function clearResponseCache(): void {
    cache.clear();
}

export function getCachedResponse(key: string): HTTPResponse | undefined {
    const entry = cache.get(key);

    if (!entry) {
        return undefined;
    }

    if (Date.now() >= entry.expiresAt) {
        cache.delete(key);
        return undefined;
    }

    cache.delete(key);
    cache.set(key, entry);

    return new HTTPResponse(
        entry.response.statusCode,
        copyHeaders(entry.response.headers),
        entry.response.body,
        entry.response.chunked,
        entry.response.chunks,
        entry.response.stream,
    );
}

export function setCachedResponse(key: string, response: HTTPResponse): void {
    if (response.stream || response.chunked) {
        return;
    }

    if (cache.size >= MAX_CACHE_ENTRIES) {
        if (cache.has(key)) {
            cache.delete(key);
        }

        const oldestKey = cache.keys().next().value;

        if (oldestKey !== undefined) {
            cache.delete(oldestKey);
        }
    }

    cache.set(key, {
        response: new HTTPResponse(
            response.statusCode,
            copyHeaders(response.headers),
            response.body,
            response.chunked,
            response.chunks,
            response.stream,
        ),
        expiresAt: Date.now() + 60_000,
    });
}

export function invalidateCachedResponse(key: string): void {
    cache.delete(key);
}
