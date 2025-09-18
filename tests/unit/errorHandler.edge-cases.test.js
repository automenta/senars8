import {
    AppError,
    createInferenceError,
    createMemoryError,
    createModuleErrorHandler,
    createParseError,
    createPlanningError,
    createValidationError,
    ERROR_TYPES,
    handleError,
    isInferenceError,
    isMemoryError,
    isParseError,
    isPlanningError,
    isValidationError,
    safeAsync,
    safeSync,
} from '../../src/utils/errorHandler.js';

describe('Error Handler - Edge Cases', () => {
    test('should handle null and undefined errors', async () => {
        expect(() => handleError(null, 'test context')).toThrow(AppError);
        const result = await safeAsync(() => {
            throw null;
        }, 'test context', 'default');
        expect(result).toBe('default');
    });

    test('should handle error context correctly', () => {
        const error = new Error('test error');
        const context = 'TestModule.testFunction';
        expect(() => handleError(error, context)).toThrow(`[${context}] test error`);
    });

    test('should handle empty context', () => {
        const error = new Error('test error');
        expect(() => handleError(error, '')).toThrow('test error');
        const result = safeSync(() => {
            throw error;
        }, '', 'default');
        expect(result).toBe('default');
    });

    test('should handle custom error types with context', () => {
        const context = 'TestContext';
        const testErrorCreation = (createFn, type) => {
            const error = createFn('test failed', context);
            expect(error).toBeInstanceOf(AppError);
            expect(error.name).toBe(type);
            expect(error.context).toBe(context);
        };

        testErrorCreation(createValidationError, ERROR_TYPES.VALIDATION);
        testErrorCreation(createParseError, ERROR_TYPES.PARSE);
        testErrorCreation(createInferenceError, ERROR_TYPES.INFERENCE);
        testErrorCreation(createPlanningError, ERROR_TYPES.PLANNING);
        testErrorCreation(createMemoryError, ERROR_TYPES.MEMORY);
    });

    test('should handle error type checking', () => {
        const validationError = createValidationError('validation error');
        const parseError = createParseError('parse error');
        const inferenceError = createInferenceError('inference error');
        const planningError = createPlanningError('planning error');
        const memoryError = createMemoryError('memory error');
        const genericError = new Error('generic error');

        expect(isValidationError(validationError)).toBe(true);
        expect(isValidationError(parseError)).toBe(false);
        expect(isValidationError(genericError)).toBe(false);

        expect(isParseError(parseError)).toBe(true);
        expect(isParseError(validationError)).toBe(false);
        expect(isParseError(genericError)).toBe(false);

        expect(isInferenceError(inferenceError)).toBe(true);
        expect(isInferenceError(parseError)).toBe(false);
        expect(isInferenceError(genericError)).toBe(false);

        expect(isPlanningError(planningError)).toBe(true);
        expect(isPlanningError(inferenceError)).toBe(false);
        expect(isPlanningError(genericError)).toBe(false);

        expect(isMemoryError(memoryError)).toBe(true);
        expect(isMemoryError(planningError)).toBe(false);
        expect(isMemoryError(genericError)).toBe(false);
    });

    test('should handle module error handler edge cases for safeAsync', async () => {
        const moduleHandler = createModuleErrorHandler('TestModule');

        expect(typeof moduleHandler.handle).toBe('function');
        expect(typeof moduleHandler.safeAsync).toBe('function');
        expect(typeof moduleHandler.safeSync).toBe('function');

        const asyncThrowingFunction = async () => {
            throw new Error('async error');
        };
        const result = await moduleHandler.safeAsync(asyncThrowingFunction, 'test context', 'default');
        expect(result).toBe('default');
    });

    test('should handle module error handler edge cases for safeSync', () => {
        const moduleHandler = createModuleErrorHandler('TestModule');
        const syncThrowingFunction = () => {
            throw new Error('sync error');
        };
        const syncResult = moduleHandler.safeSync(syncThrowingFunction, 'test context', 'default');
        expect(syncResult).toBe('default');
    });

    test('should handle nested error handling', () => {
        const innerError = new Error('inner error');
        const outerContext = 'OuterContext';
        const innerContext = 'InnerContext';

        expect(() => {
            try {
                handleError(innerError, innerContext);
            } catch (caughtError) {
                handleError(caughtError, outerContext);
            }
        }).toThrow(`[${outerContext}] [${innerContext}] inner error`);
    });

    test('should handle very long error messages', () => {
        const longMessage = 'a'.repeat(10000);
        const error = new Error(longMessage);
        expect(() => handleError(error, 'test')).toThrow(`[test] ${longMessage}`);
    });

    test('should handle error objects with circular references', () => {
        const error = new Error('circular error');
        error.self = error;
        expect(() => handleError(error, 'test')).toThrow('[test] circular error');
    });

    test('should preserve original stack traces', () => {
        const error = new Error('test error');
        try {
            handleError(error, 'test context');
        } catch (handledError) {
            expect(handledError.originalStack).toBeDefined();
        }
    });
});