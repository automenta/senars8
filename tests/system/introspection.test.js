import {afterAll, beforeAll, describe, expect, test, vi} from 'vitest';
import {parseTerm} from '../../core/parser/narseseParser.js';
import Task from '../../core/core/Task.js';

vi.mock('@xenova/transformers', () => ({
    pipeline: vi.fn(async () => {
        return vi.fn(() => ({
            data: new Float32Array([1, 2, 3])
        }));
    }),
    env: {
        allowLocalModels: false,
        allowRemoteModels: true,
    },
}));

const {default: SystemFactory} = await import('../../core/system/SystemFactory.js');

describe('System Introspection API', () => {
    let system;

    beforeAll(() => {
        const customConfig = {
            LM: {
                LLM_PROVIDER: 'xenova',
            },
            planner: {
                strategy: 'HTN'
            }
        };
        system = SystemFactory.createSystem(customConfig);
    });

    afterAll(async () => {
        if (system) {
            const status = await system.introspection?.getStatus();
            if (status?.isRunning) {
                system.stop();
            }
        }
    });

    test('should get system status', async () => {
        const status = await system.introspection.getStatus();
        expect(status).toBeDefined();
        expect(status).toHaveProperty('isRunning', false);
        expect(status).toHaveProperty('cycleCount', 0);
        expect(status).toHaveProperty('memory');
        expect(status.memory).toHaveProperty('terms');
    });

    test('should get system configuration', () => {
        const config = system.introspection.getConfig();
        expect(config).toBeDefined();
        expect(config).toHaveProperty('FOCUS_SET_SIZE');
        expect(config).toHaveProperty('memory.MAINTENANCE_CYCLE_FREQUENCY');
    });

    test('should query tasks from memory', async () => {
        const beliefTask = new Task(parseTerm('(cat --> animal)'), '.');
        const goalTask = new Task(parseTerm('(user --> happy)'), '!');

        await system.addTasks([beliefTask, goalTask]);

        // Give the system a moment to process the async task additions
        await new Promise(resolve => setTimeout(resolve, 100));

        const beliefs = await system.introspection.queryTasks({
            punctuation: '.'
        });
        const goals = await system.introspection.queryTasks({
            punctuation: '!'
        });

        expect(beliefs.some(t => t.id === beliefTask.id)).toBe(true);
        expect(goals.some(t => t.id === goalTask.id)).toBe(true);
        expect(beliefs.some(t => t.id === goalTask.id)).toBe(false);
    });

    test('should get a specific term from memory', async () => {
        const termKey = '(dog --> mammal)';
        await system.addTasks([new Task(parseTerm(termKey), '.')]);

        // Give the system a moment to process the async task additions
        await new Promise(resolve => setTimeout(resolve, 100));

        const term = await system.introspection.getTerm(termKey);
        expect(term).toBeDefined();
        expect(term.key).toBe(termKey);
    });

    test('should subscribe to and receive events from the EventBus', async () => {
        const mockCallback = vi.fn();
        const { SystemEvents } = await import('../../core/system/SystemEvents.js');
        const eventName = SystemEvents.CYCLE_COMPLETE;

        system.introspection.on(eventName, mockCallback);

        await system.runCycle();

        expect(mockCallback).toHaveBeenCalled();
        expect(mockCallback).toHaveBeenCalledTimes(1);

        system.introspection.off(eventName, mockCallback);

        await system.runCycle();
        expect(mockCallback).toHaveBeenCalledTimes(1);
    }, 10000); // 10 second timeout

    test('should get available reasoner rules', () => {
        const rules = system.introspection.getAvailableRules();
        expect(rules).toBeInstanceOf(Array);
        expect(rules.length).toBeGreaterThan(0);
        expect(rules).toContain('Modus Ponens');
        expect(rules).toContain('Induction');
    });

    test('should get info for a specific rule', () => {
        const ruleName = 'Modus Ponens';
        const ruleInfo = system.introspection.getRuleInfo(ruleName);
        expect(ruleInfo).toBeDefined();
        expect(ruleInfo).toHaveProperty('name', ruleName);
        expect(ruleInfo).toHaveProperty('arity', 2);
        expect(ruleInfo).toHaveProperty('description');
    });
});