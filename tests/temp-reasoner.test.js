const BagSamplingStrategy = require('../src/reasoner/strategies/BagSamplingStrategy');
const Task = require('../src/core/Task');
const { parseTerm } = require('../src/parser/narseseParser');

describe('Reasoner Strategy Tests', () => {
    test('BagSamplingStrategy should select combinations of tasks', () => {
        const strategy = new BagSamplingStrategy();
        const task1 = new Task(parseTerm('a'), '.', { frequency: 1.0, confidence: 0.9 });
        task1.state.priority = 0.9;
        const task2 = new Task(parseTerm('b'), '.', { frequency: 1.0, confidence: 0.8 });
        task2.state.priority = 0.8;
        const task3 = new Task(parseTerm('c'), '.', { frequency: 1.0, confidence: 0.7 });
        task3.state.priority = 0.7;

        const focusSet = [task1, task2, task3];

        const arity = 2;
        const combinations = [...strategy.selectCombinations(focusSet, arity)];

        // The number of combinations can vary due to sampling, so we just check it's plausible
        expect(combinations.length).toBeLessThanOrEqual(focusSet.length * 2);

        for (const combination of combinations) {
            expect(combination).toHaveLength(arity);
            expect(combination[0]).toBeInstanceOf(Task);
            expect(combination[1]).toBeInstanceOf(Task);
        }
    });
});
