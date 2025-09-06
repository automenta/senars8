const Reasoner = require('../src/reasoner/Reasoner');
const Memory = require('../src/memory/Memory');
const Term = require('../src/core/Term');
const Task = require('../src/core/Task');

function setupMemory(numTerms) {
    const memory = new Memory();
    for (let i = 0; i < numTerms - 1; i++) {
        const term1 = new Term(`t${i}`);
        const term2 = new Term(`t${i+1}`);
        const relation = new Term(`(${term1.key} --> ${term2.key})`);
        const task = new Task(relation, '.', { frequency: 0.9, confidence: 0.9 }, {}, 1.0);
        memory.addTerm(term1);
        memory.addTerm(term2);
        memory.addTerm(relation);
        memory.addTasks([task]);
    }
    return memory;
}

function runInferenceBenchmark(memory, durationSeconds = 5) {
    const reasoner = new Reasoner();
    const focusSet = memory.getAllTasks();

    let inferenceCount = 0;
    const startTime = process.hrtime.bigint();
    const endTime = startTime + BigInt(durationSeconds * 1e9);

    while (process.hrtime.bigint() < endTime) {
        const newInferences = reasoner.performInference(focusSet);
        inferenceCount += newInferences.length;
    }

    const actualDuration = Number(process.hrtime.bigint() - startTime) / 1e9;
    const inferencesPerSecond = inferenceCount / actualDuration;

    return {
        totalInferences: inferenceCount,
        duration: actualDuration,
        inferencesPerSecond: inferencesPerSecond
    };
}

function main() {
    console.log('--- Running Inference Benchmark ---');
    const memory = setupMemory(100); // 100 terms, 99 initial beliefs
    const results = runInferenceBenchmark(memory, 5);

    console.log(`Total Inferences: ${results.totalInferences}`);
    console.log(`Duration: ${results.duration.toFixed(3)}s`);
    console.log(`Inferences per Second: ${results.inferencesPerSecond.toFixed(2)}`);
    console.log('-----------------------------------');
}

main();
