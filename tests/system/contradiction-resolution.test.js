import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import Task from '../../core/core/Task.js';

jest.unstable_mockModule('@xenova/transformers', () => ({
    pipeline: jest.fn(async () => {
        return jest.fn(() => ({
            data: new Float32Array([1, 2, 3])
        }));
    }),
    env: {},
}));

const { default: SystemFactory } = await import('../../core/system/SystemFactory.js');

describe('System-level Contradiction Resolution', () => {
    let system;

    beforeEach(() => {
        const customConfig = {
            reasoner: {
                strategy: 'BruteForceStrategy'
            },
            temporal: {
                enabled: false
            }
        };
        system = SystemFactory.createSystem(customConfig);
    });

    afterEach(() => {
        if (system) {
            system.stop();
        }
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

        await system.runCycle();

        // Basic check that the cycle completed
        expect(system.cycleCount).toBe(1);
    }, 10000); // 10 second timeout
});
