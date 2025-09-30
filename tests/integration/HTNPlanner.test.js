import {beforeEach, describe, expect, test, vi} from 'vitest';
import HTNPlanner from '../../core/reasoner/HTNPlanner.js';
import Memory from '../../core/memory/Memory.js';
import Term from '../../core/core/Term.js';
import Task from '../../core/core/Task.js';
import ConfigManager from '../../core/config/ConfigManager.js';

describe('HTNPlanner Integration Test', () => {
    let memory;
    let planner;
    let configManager;

    const addTermToMemory = (key, complexity = 1) => {
        const term = new Term(key, [], complexity);
        memory._addTerm(term);
        return term;
    };

    beforeEach(() => {
        configManager = new ConfigManager();
        const mockEventBus = {
            on: vi.fn(),
            emit: vi.fn(),
            emitAsync: vi.fn(),
        };
        const mockCommandBus = {
            handle: vi.fn(),
            request: vi.fn(),
        };
        memory = new Memory(configManager, mockEventBus, mockCommandBus);
        const lm = {
            bootstrapTerm: async termKey => new Term(termKey, [0.1, 0.2, 0.3])
        };
        planner = new HTNPlanner(lm, mockCommandBus, configManager);
    });

    test('should find a simple plan with one level of decomposition', async () => {
        const goalKey = 'a';
        const action1Key = 'b';
        const action2Key = 'c';
        const methodKey = `(${goalKey} ==> (&&,${action1Key},${action2Key}))`;

        const goalTerm = addTermToMemory(goalKey);
        addTermToMemory(action1Key);
        addTermToMemory(action2Key);
        addTermToMemory(methodKey);

        const goalTask = new Task(goalTerm, '!', {
            frequency: 1.0,
            confidence: 0.9
        });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan).toHaveLength(2);
        expect(plan[0].key).toBe(action1Key);
        expect(plan[1].key).toBe(action2Key);
    });
});