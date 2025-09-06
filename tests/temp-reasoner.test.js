const BagSamplingStrategy = require('../src/reasoner/strategies/BagSamplingStrategy');
const Task = require('../src/core/Task');
const { parseTerm } = require('../src/parser/narseseParser');

describe('Temporary Reasoner Tests', () => {
    test('BagSamplingStrategy should select pairs of tasks', () => {
        const strategy = new BagSamplingStrategy();
        const task1 = new Task(parseTerm('a'), '.', {}, {}, 1);
        const task2 = new Task(parseTerm('b'), '.', {}, {}, 1);
        const task3 = new Task(parseTerm('c'), '.', {}, {}, 1);
        const focusSet = [task1, task2, task3];

        const pairs = [...strategy.selectPairs(focusSet)];
        expect(pairs.length).toBeGreaterThan(0);
        for (const pair of pairs) {
            expect(pair).toHaveLength(2);
            expect(pair[0]).toBeInstanceOf(Task);
            expect(pair[1]).toBeInstanceOf(Task);
        }
    });
});
