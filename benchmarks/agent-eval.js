import Agent from '../src/agent/Agent.js';
import fs from 'fs/promises';
import path from 'path';
import assert from 'assert';

const RESULTS_DIR = 'results';

/**
 * A generic function to run an evaluation benchmark.
 * @param {object} benchmark - The benchmark to run.
 * @param {string} benchmark.name - The name of the benchmark.
 * @param {Function} benchmark.run - The function that executes the benchmark.
 * @param {Agent} agent - The agent instance to use for the benchmark.
 */
async function runEvaluation(benchmark, agent) {
    console.log(`\n--- Running Benchmark: ${benchmark.name} ---`);
    const metrics = {
        startTime: Date.now(),
        success: false,
        steps: [],
        error: null,
        performance: {
            duration: 0,
            taskCompletionRate: 0,
            timeToCompletion: 0,
        },
        agentInternal: {
            reasoningCycles: 0,
            knowledgeBaseSize: 0,
            contradictionsDetected: 0,
        },
        tokenomics: {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
        },
    };

    try {
        await benchmark.run({ agent, metrics, assert });
        metrics.success = true;
        console.log(`--- ✅ SUCCESS: ${benchmark.name} ---`);
    } catch (error) {
        metrics.error = {
            message: error.message,
            stack: error.stack,
        };
        console.error(`--- ❌ FAILED: ${benchmark.name} ---`);
        console.error(error);
    } finally {
        metrics.endTime = Date.now();
        metrics.duration = metrics.endTime - metrics.startTime;
        await saveResults(benchmark.name, metrics);
    }
}

/**
 * Saves the evaluation results to a JSON file.
 * @param {string} benchmarkName - The name of the benchmark.
 * @param {object} metrics - The metrics to save.
 */
async function saveResults(benchmarkName, metrics) {
    try {
        await fs.mkdir(RESULTS_DIR, { recursive: true });
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const filename = `${benchmarkName.replace(/\s/g, '_')}_${timestamp}.json`;
        const filepath = path.join(RESULTS_DIR, filename);
        await fs.writeFile(filepath, JSON.stringify(metrics, null, 2));
        console.log(`Results saved to ${filepath}`);
    } catch (error) {
        console.error('Error saving results:', error);
    }
}

/**
 * Dynamically loads and runs all benchmarks from the benchmarks/suites directory.
 */
async function main() {
    const agent = new Agent();
    console.log('Initializing agent...');
    await agent.initialize();
    console.log('Agent initialized.');

    const suitesDir = path.join('benchmarks', 'suites');
    const files = await fs.readdir(suitesDir);

    for (const file of files) {
        if (file.endsWith('.js')) {
            const suitePath = path.join(process.cwd(), suitesDir, file);
            try {
                const { default: benchmark } = await import(`file://${suitePath}`);
                if (benchmark && benchmark.name && benchmark.run) {
                    await runEvaluation(benchmark, agent);
                } else {
                    console.warn(`Skipping invalid benchmark file: ${file}`);
                }
            } catch (error) {
                console.error(`Error loading benchmark from ${file}:`, error);
            }
        }
    }
}

main().catch(error => {
    console.error('A critical error occurred in the main execution block:', error);
    process.exit(1);
});
