import EventBus from '../../src/system/EventBus.js';
import System from '../../src/system/System.js';
import Memory from '../../src/memory/Memory.js';
import {
    parseTerm
} from '../../src/parser/parse-utils.js';
import Task from '../../src/core/Task.js';
import ConfigManager from '../../src/config/ConfigManager.js';
import SystemFactory from '../../src/system/SystemFactory.js';


jest.mock('@xenova/transformers', () => {
    const transformers = jest.createMockFromModule('@xenova/transformers');
    transformers.pipeline = jest.fn(async () => {
        return jest.fn(() => ({
            data: new Float32Array([1, 2, 3])
        }));
    });
    return transformers;
});

describe('System-level Contradiction Resolution', () => {
    let system;

    beforeEach(async () => {
        const customConfig = {
            reasoner: {
                strategy: 'BruteForce'
            },
            temporal: {
                enabled: false
            }
        };
        const configManager = new ConfigManager(customConfig);
        system = await SystemFactory.createSystem(configManager);
    });

    afterEach(() => {
        system.stop();
    });

    test('should detect and propose a resolution for a direct contradiction', async () => {
        const task1 = new Task('<a --> b>.', '.', {
            confidence: 0.9,
            priority: 0.9
        });
        const task2 = new Task('<a --> b_neg>.', '.', {
            confidence: 0.9,
            priority: 0.9
        });

        await system.addTasks([task1, task2]);

        console.log(system);

        const findContradictionsSpy = jest.spyOn(system.metaCognition, 'findContradictions');
        const resolveContradictionSpy = jest.spyOn(system.metaCognition, 'resolve');

        await system.runCycle();

        expect(findContradictionsSpy).toHaveBeenCalled();

        const contradictions = await findContradictionsSpy.mock.results[0].value;
        expect(contradictions.length).toBe(1);

        expect(resolveContradictionSpy).toHaveBeenCalledWith(contradictions);
    });
});
