import {beforeEach, describe, expect, test, vi} from 'vitest';
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
            emitAsync: vi.fn(),
        };
        const mockCommandBus = {
            handle: vi.fn(),
            request: vi.fn(async (command, payload) => {
                // Mock the memory commands that the planner will request
                switch(command) {
                    case 'memory:getTerm':
                        return memory._getTerm(payload?.key || payload);
                    case 'memory:getStats':
                        return memory._getStatistics();
                    case 'memory:queryTasks':
                        return await memory._queryTasks(payload?.filters || payload || {});
                    case 'memory:getTask':
                        return memory._getTask(payload?.id || payload);
                    case 'memory:getAllTerms':
                        return await memory._getAllTerms();
                    case 'memory:getAllTasks':
                        return await memory._getAllTasks();
                    case 'memory:getBeliefs':
                        return await memory._getBeliefs();
                    case 'memory:getGoals':
                        return await memory._getGoals();
                    case 'memory:getQuestions':
                        return await memory._getQuestions();
                    case 'memory:exportState':
                        return memory.exportState();
                    case 'memory:importState':
                        return memory.importState(payload);
                    case 'memory:getImplications':
                        return await memory._getImplications(payload);
                    case 'memory:getCost':
                        return await memory._getCost(payload);
                    case 'memory:getRecentTasks':
                        return await memory._getRecentTasks(payload);
                    case 'memory:getHighestPriorityTasks':
                        return await memory._getHighestPriorityTasks(payload);
                    default:
                        // For other commands, we might need to implement them
                        // For now, let's just return null or handle as needed
                        return null;
                }
            }),
        };
        memory = new Memory(configManager, mockEventBus, mockCommandBus);
        const lm = {
            bootstrapTerm: async termKey => new Term(termKey, [0.1, 0.2, 0.3])
        };
        planner = new AStarPlanner(lm, mockCommandBus, configManager);
    });

    const addTermToMemory = key => {
        const term = new Term(key, [Math.random(), Math.random(), Math.random()]);
        memory._addTerm(term);
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