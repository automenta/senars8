import {beforeEach, describe, expect, vi, test} from 'vitest';
import AStarPlanner from '../../core/reasoner/AStarPlanner.js';
import Memory from '../../core/memory/Memory.js';
import Term from '../../core/core/Term.js';
import Task from '../../core/core/Task.js';
import ConfigManager from '../../core/config/ConfigManager.js';

describe('AStarPlanner Debug Test', () => {
    let memory;
    let planner;

    beforeEach(() => {
        const configManager = new ConfigManager();
        const mockEventBus = {
            on: vi.fn(),
            emit: vi.fn(),
        };
        memory = new Memory(configManager, mockEventBus);
        const lm = {
            bootstrapTerm: async termKey => new Term(termKey, [0.1, 0.2, 0.3])
        };
        const logger = {
            warn: vi.fn(),
            info: vi.fn(),
            debug: vi.fn(),
            error: vi.fn(),
        };
        planner = new AStarPlanner(memory, lm, configManager, logger);
    });

    const addTermToMemory = key => {
        const term = new Term(key, [Math.random(), Math.random(), Math.random()]);
        memory.addTerm(term);
        return term;
    };

    test('should find a simple plan', async () => {
        addTermToMemory('(goal ==> action)');
        const goalTerm = addTermToMemory('goal');
        addTermToMemory('action');

        const goalTask = new Task(goalTerm, '!', {
            confidence: 0.9
        });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan.map(p => p.key)).toEqual(['action']);
    });
});