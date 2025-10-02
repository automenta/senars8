import {
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    vi
} from 'vitest';
import {
    wrapAsync
} from '../../core/utils/asyncWrapper.js';
import * as logger from '../../core/utils/logger.js';

describe('wrapAsync', () => {
    let errorSpy;

    beforeEach(() => {
        errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        errorSpy.mockRestore();
    });

    const moduleName = 'TestModule';
    const context = 'testContext';

    it('should return the result of the wrapped function when it succeeds', async () => {
        const successfulFunction = async (a, b) => a + b;
        const wrapped = wrapAsync(successfulFunction, moduleName, context);
        const result = await wrapped(2, 3);
        expect(result).toBe(5);
    });

    it('should return the default value when the wrapped function fails and rethrow is false', async () => {
        const failingFunction = async () => {
            throw new Error('Test error');
        };
        const wrapped = wrapAsync(failingFunction, moduleName, context, {
            defaultValue: 'default'
        });
        const result = await wrapped();
        expect(result).toBe('default');
    });

    it('should return null when the wrapped function fails and no default value is provided', async () => {
        const failingFunction = async () => {
            throw new Error('Test error');
        };
        const wrapped = wrapAsync(failingFunction, moduleName, context);
        const result = await wrapped();
        expect(result).toBeNull();
    });

    it('should re-throw the error when the wrapped function fails and rethrow is true', async () => {
        const failingFunction = async () => {
            throw new Error('Test error');
        };
        const wrapped = wrapAsync(failingFunction, moduleName, context, {
            rethrow: true
        });
        await expect(wrapped()).rejects.toThrow('Test error');
    });

    it('should pass arguments to the wrapped function correctly', async () => {
        const successfulFunction = async (a, b, c) => a * b * c;
        const wrapped = wrapAsync(successfulFunction, moduleName, context);
        const result = await wrapped(2, 3, 4);
        expect(result).toBe(24);
    });
});