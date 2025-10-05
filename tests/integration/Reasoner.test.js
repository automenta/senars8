import {beforeEach, describe, expect, test, vi} from 'vitest';
import Task from '../../core/core/Task.js';
import Term from '../../core/core/Term.js';
import {parseTerm} from '../../core/parser/narseseParser.js';
import {createTestConfig, setupTestEnvironment} from '../test-setup.js';
import {SystemCommands} from '../../core/system/SystemCommands.js';

vi.mock('@xenova/transformers', () => ({
    pipeline: vi.fn(async () =>
        vi.fn(() => ({
            data: new Float32Array([1, 2, 3])
        }))
    ),
    env: {},
}));

const createTerm = async (commandBus, memory, termKey) => {
    const term = await commandBus.request(SystemCommands.LM_BOOTSTRAP_TERM, {termKey});
    await memory.addTerm(term);
    return term;
};

// Local helper to set up command bus mock for system
const setupCommandBusMock = (commandBus) => {
    commandBus.request.mockImplementation(async (command, payload) => {
        if (command === SystemCommands.LM_BOOTSTRAP_TERM) {
            return new Term(payload.termKey, [], 1);
        }
        return null;
    });
};

describe('Reasoner Integration Test', () => {
    let system, reasoner, memory, commandBus;

    beforeEach(() => {
        const testEnv = setupTestEnvironment(createTestConfig());
        system = testEnv.system;
        reasoner = system.reasoner;
        memory = testEnv.container.get('memory'); // Get memory from container
        commandBus = testEnv.commandBus;

        setupCommandBusMock(commandBus);
    });

    test('should perform modus ponens', async () => {
        const termA = await createTerm(commandBus, memory, 'cat');
        await createTerm(commandBus, memory, 'mammal');
        const task1 = new Task(parseTerm('(cat ==> mammal)'), '.');
        const task2 = new Task(termA, '.');

        const derivedTasks = await reasoner.performInference([task1, task2]);
        expect(derivedTasks.some(t => t.termKey === 'mammal')).toBe(true);
    });

    test('should perform inheritance chaining', async () => {
        await createTerm(commandBus, memory, 'cat');
        await createTerm(commandBus, memory, 'mammal');
        await createTerm(commandBus, memory, 'animal');
        const task1 = new Task(parseTerm('(cat --> mammal)'), '.');
        const task2 = new Task(parseTerm('(mammal --> animal)'), '.');

        const derivedTasks = await reasoner.performInference([task1, task2]);
        expect(derivedTasks.some(t => t.termKey === '(cat --> animal)')).toBe(true);
    });
});