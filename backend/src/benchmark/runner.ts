(async () => {
    const totalRequests =
        process.argv[2] === undefined ? 100 : Number(process.argv[2]);

    const concurrency =
        process.argv[3] === undefined ? 10 : Number(process.argv[3]);

    if (
        !Number.isInteger(totalRequests) ||
        !Number.isInteger(concurrency) ||
        totalRequests <= 0 ||
        concurrency <= 0
    ) {
        console.error(
            "Error: totalRequests and concurrency must be positive integers.",
        );
        process.exit(1);
    }

    const batchStart = performance.now();

    const latencies: number[] = [];

    let failedRequests = 0;

    for (let i = 0; i < totalRequests; i += concurrency) {
        const requests: Promise<number>[] = [];

        const batchSize = Math.min(concurrency, totalRequests - i);

        for (let j = 0; j < batchSize; j++) {
            const request = (async () => {
                const start = performance.now();

                const response = await fetch(
                    "http://localhost:8080/users?name=Shaurya",
                );

                if (!response.ok) {
                    throw new Error(`Request failed: ${response.status}`);
                }

                const end = performance.now();

                return end - start;
            })();

            requests.push(request);
        }

        const batchLatencies = await Promise.allSettled(requests);

        for (const result of batchLatencies) {
            if (result.status === "fulfilled") {
                latencies.push(result.value);
            } else {
                failedRequests++;
            }
        }
    }

    const batchEnd = performance.now();
    const batchTime = batchEnd - batchStart;

    console.log(`Requests: ${totalRequests}`);
    console.log(`Concurrency: ${concurrency}`);
    console.log(`Failed requests: ${failedRequests}`);

    const successRate =
        ((totalRequests - failedRequests) / totalRequests) * 100;

    const rps = (totalRequests - failedRequests) / (batchTime / 1000);

    console.log(`Batch time: ${batchTime.toFixed(2)} ms`);
    console.log(`Requests/sec: ${rps.toFixed(2)}`);

    if (latencies.length === 0) {
        console.log("No successful requests; latency statistics unavailable.");
    } else {
        const total = latencies.reduce((sum, latency) => sum + latency, 0);
        const average = total / latencies.length;

        latencies.sort((a, b) => a - b);

        const p95Index = Math.ceil(0.95 * latencies.length) - 1;
        const p95Latency = latencies[p95Index];

        const p99Index = Math.ceil(0.99 * latencies.length) - 1;
        const p99Latency = latencies[p99Index];

        const minLatency = Math.min(...latencies);
        const maxLatency = Math.max(...latencies);

        console.log(`Average latency: ${average.toFixed(2)} ms`);
        console.log(`Minimum latency: ${minLatency.toFixed(2)} ms`);
        console.log(`Maximum latency: ${maxLatency.toFixed(2)} ms`);
        console.log(`P95 latency: ${p95Latency.toFixed(2)} ms`);
        console.log(`P99 latency: ${p99Latency.toFixed(2)} ms`);
    }

    console.log(`Successful requests: ${totalRequests - failedRequests}`);
    console.log(`Failed requests: ${failedRequests}`);
    console.log(`Success rate: ${successRate.toFixed(2)}%`);
})();
