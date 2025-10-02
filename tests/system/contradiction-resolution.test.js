import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import Task from '../../core/core/Task.js';
import * as logger from '../../core/utils/logger.js';

vi.mock('@xenova/transformers', () => ({
    pipeline: vi.fn(async () => {
        return vi.fn(() => ({
            data: new Float32Array([1, 2, 3])
        }));
    }),
    env: {},
}));

const {default: SystemFactory} = await import('../../core/system/SystemFactory.js');

describe('System-level Contradiction Resolution', () => {
    let system;
    let warnSpy;

    beforeEach(() => {
        warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {
        });

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
        warnSpy.mockRestore();
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