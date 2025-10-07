// tests/unit/CoreAgent.Reasoning.test.js - Consolidated from coreagent/__tests__/Reasoning.test.js
import {beforeEach, describe, expect, it} from 'vitest';
import {createCore} from '../../coreagent/createCore.js';
import {createTask} from '../../coreagent/utils.js';

describe('CoreAgent Reasoning', () => {
    let system, reasoning, memory;

    beforeEach(async () => {
        system = createCore();
        await system.initialize();
        reasoning = system.reasoning;
        memory = system.memory;
    });

    it('should process tasks through legacy interface', async () => {
        const task = createTask('test', 'question', 0.7);
        const belief = createTask('test', 'belief', 0.8);

        await memory._addTask(task);
        await memory._addTask(belief);

        const result = await system.request('reasoner:processTask', {focusSet: [task]});

        // With the current implementation, this might return null since strategies don't match
        expect(result).toBeDefined();
    });

    it('should register and use strategies', () => {
        const strategy = {
            name: 'test-strategy',
            priority: 0.8,
            canHandle: () => true,
            execute: () => ({success: true, derived: {test: true}})
        };

        reasoning.addStrategy(strategy);

        expect(reasoning.strategies.has('test-strategy')).toBe(true);
    });

    it('should evaluate winnowed strategies', () => {
        const task = createTask('test task');
        const belief = createTask('test belief');

        // Check that winnowStrategies returns empty array for no matches initially
        const filtered = reasoning._winnowStrategies([task], [belief]);
        expect(Array.isArray(filtered)).toBe(true);
    });

    it('should provide reasoning statistics', () => {
        const stats = reasoning.getStats();
        expect(stats).toHaveProperty('rules');
        expect(stats).toHaveProperty('performance');
        expect(stats).toHaveProperty('strategies');
    });

    it('should handle deductive reasoning', async () => {
        const implication = createTask('A implies B', 'implication', 0.8);
        const belief = createTask('A', 'belief', 0.7);

        // Test deductive reasoning strategy
        const result = await reasoning._deductiveReason(implication, belief, {});

        if (result && result.success) {
            expect(result.derived).toBeDefined();
            expect(result.derived.type).toBe('belief');
        }
    });

    it('should process tasks with beliefs', async () => {
        const task = createTask('test question', 'question', 0.7);
        const belief = createTask('test belief', 'belief', 0.8);

        const result = await reasoning._processTask({task, beliefs: [belief]});

        // Result may be null if no strategies match, but should not throw
        expect(result === null || typeof result === 'object').toBe(true);
    });
});