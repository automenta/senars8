const Reasoner = require('../src/reasoner/Reasoner');
const Memory = require('../src/memory/Memory');
const {createTask} = require('../shared/demo-utils');

function setupMemory(numTerms) {
    const memory = new Memory();
    for (let i = 0; i < numTerms - 1; i++) {
        const task = createTask(`(t${i} --> t${i + 1})`, '.', {frequency: 0.9, confidence: 0.9}, {}, 1.0);
        if (task) {
            memory.addTasks([task]);
        }
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
