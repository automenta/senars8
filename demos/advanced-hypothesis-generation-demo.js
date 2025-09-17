import System from '../src/System.js';
import Task from '../src/Task.js';
import {
    parseTerm
} from '../src/parser.js';
import {
    log,
    print_task
} from './shared/demo-utils.js';

async function advancedHypothesisGenerationDemo() {
    log('Advanced Hypothesis Generation Demo');

    const system = new System();
    await system.initialize();

    const tasks = [
        new Task(parseTerm('<a --> b>.')),
        new Task(parseTerm('<b --> c>.')),
        new Task(parseTerm('<d --> c>.')),
    ];
    await system.addTasks(tasks);

    log('Initial tasks added to memory.');
    tasks.forEach(print_task);

    await system.runCycles(3);

    log('Running hypothesis generation...');
    const hypotheses = await system.lm.generateHypotheses(system.memory.getAllTasks(), {
        type: 'creative',
        num: 5
    });

    log(`Generated ${hypotheses.length} creative hypotheses:`);
    hypotheses.forEach(print_task);

    log('Evaluating and ranking hypotheses...');
    const rankedHypotheses = await system.lm.evaluateAndRankHypotheses(tasks, hypotheses);

    log('Ranked hypotheses:');
    rankedHypotheses.forEach(print_task);

    log('Demo finished.');
}

advancedHypothesisGenerationDemo();
