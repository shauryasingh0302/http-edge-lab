(async () => {
    const totalRequests =
        process.argv[2] === undefined ? 100 : Number(process.argv[2]);

    const concurrency =
        process.argv[3] === undefined ? 10 : Number(process.argv[3]);

    const runCount =
        process.argv[4] === undefined ? 1 : Number(process.argv[4]);

    if (
        !Number.isInteger(totalRequests) ||
        !Number.isInteger(concurrency) ||
        !Number.isInteger(runCount) ||
        runCount <= 0 ||
        totalRequests <= 0 ||
        concurrency <= 0
    ) {
        console.error(
            "Error: totalRequests and concurrency must be positive integers.",
        );
        process.exit(1);
    }

    const targetUrl = "http://localhost:8080/users?name=Shaurya";

    const warmupCount = Math.min(concurrency, totalRequests);

    const warmupResults = await Promise.allSettled(
        Array.from({ length: warmupCount }, async () => {
            const response = await fetch(targetUrl);

            if (!response.ok) {
                throw new Error(`Warm-up request failed: ${response.status}`);
            }

            await response.text();
        }),
    );

    const warmupFailures = warmupResults.filter(
        (result) => result.status === "rejected",
    ).length;

    console.log(`Warm-up requests: ${warmupCount}`);
    console.log(`Warm-up failures: ${warmupFailures}`);

    const runThroughputs: number[] = [];

    for (let run = 1; run <= runCount; run++) {
        const batchStart = performance.now();

        const latencies: number[] = [];
        let failedRequests = 0;

        for (let i = 0; i < totalRequests; i += concurrency) {
            const requests: Promise<number>[] = [];

            const batchSize = Math.min(concurrency, totalRequests - i);

            for (let j = 0; j < batchSize; j++) {
                const request = (async () => {
                    const start = performance.now();

                    const response = await fetch(targetUrl);

                    if (!response.ok) {
                        throw new Error(`Request failed: ${response.status}`);
                    }

                    await response.text();

                    return performance.now() - start;
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

        const batchTime = performance.now() - batchStart;
        const successfulRequests = latencies.length;
        const successRate = (successfulRequests / totalRequests) * 100;
        const rps = successfulRequests / (batchTime / 1000);

        runThroughputs.push(rps);

        console.log(`\n--- Run ${run}/${runCount} ---`);
        console.log(`Requests: ${totalRequests}`);
        console.log(`Concurrency: ${concurrency}`);
        console.log(`Batch time: ${batchTime.toFixed(2)} ms`);
        console.log(`Requests/sec: ${rps.toFixed(2)}`);
        console.log(`Successful requests: ${successfulRequests}`);
        console.log(`Failed requests: ${failedRequests}`);
        console.log(`Success rate: ${successRate.toFixed(2)}%`);

        if (latencies.length === 0) {
            console.log(
                "No successful requests; latency statistics unavailable.",
            );
            continue;
        }

        const totalLatency = latencies.reduce(
            (sum, latency) => sum + latency,
            0,
        );
        const average = totalLatency / latencies.length;

        latencies.sort((a, b) => a - b);

        const p50Index = Math.ceil(0.5 * latencies.length) - 1;
        const p95Index = Math.ceil(0.95 * latencies.length) - 1;
        const p99Index = Math.ceil(0.99 * latencies.length) - 1;

        console.log(`Average latency: ${average.toFixed(2)} ms`);
        console.log(`Minimum latency: ${latencies[0].toFixed(2)} ms`);
        console.log(
            `Maximum latency: ${latencies[latencies.length - 1].toFixed(2)} ms`,
        );
        console.log(`P50 latency: ${latencies[p50Index].toFixed(2)} ms`);
        console.log(`P95 latency: ${latencies[p95Index].toFixed(2)} ms`);
        console.log(`P99 latency: ${latencies[p99Index].toFixed(2)} ms`);
    }

    const averageThroughput =
        runThroughputs.reduce((sum, throughput) => sum + throughput, 0) /
        runThroughputs.length;

    console.log(
        `\nAverage throughput across ${runCount} runs: ${averageThroughput.toFixed(2)} requests/sec`,
    );
})();
