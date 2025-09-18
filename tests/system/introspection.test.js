import SystemFactory from '../../src/system/SystemFactory.js';
import {parseTerm} from '../../src/parser/narseseParser.js';
import Task from '../../src/core/Task.js';
import ConfigManager from '../../src/config/ConfigManager.js';

jest.mock('@xenova/transformers', () => {
    const transformers = jest.createMockFromModule('@xenova/transformers');
    transformers.pipeline = jest.fn(async () => {
        return jest.fn(() => ({
            data: new Float32Array([1, 2, 3])
        }));
    });
    return transformers;
});

describe('System Introspection API', () => {
    let system;

    beforeAll(async () => {
        const customConfig = {
            LM: {
                LLM_PROVIDER: 'xenova',
            },
            planner: {
                strategy: 'HTN'
            }
        };
        const configManager = new ConfigManager(customConfig);
        system = await SystemFactory.createSystem(configManager);
    });

    afterAll(() => {
        if (system && system.introspection.getStatus().isRunning) {
            system.stop();
        }
    });

    test('should get system status', () => {
        const status = system.introspection.getStatus();
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

        const beliefs = system.introspection.queryTasks({
            punctuation: '.'
        });
        const goals = system.introspection.queryTasks({
            punctuation: '!'
        });

        expect(beliefs.some(t => t.id === beliefTask.id)).toBe(true);
        expect(goals.some(t => t.id === goalTask.id)).toBe(true);
        expect(beliefs.some(t => t.id === goalTask.id)).toBe(false);
    });

    test('should get a specific term from memory', async () => {
        const termKey = '(dog --> mammal)';
        await system.addTasks([new Task(parseTerm(termKey), '.')]);

        const term = system.introspection.getTerm(termKey);
        expect(term).toBeDefined();
        expect(term.key).toBe(termKey);
    });

    test('should subscribe to and receive events from the EventBus', async () => {
        const mockCallback = jest.fn();
        const eventName = 'SystemCycleEnded';

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
