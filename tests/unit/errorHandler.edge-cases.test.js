import {
    createError,
    createModuleErrorHandler,
    Errors,
    isError,
    safeAsync,
    safeSync
} from '../../core/utils/errorHandler.js';

describe('Error Handler - Edge Cases', () => {
    const testHandler = createModuleErrorHandler('TestModule');

    test('should handle null and undefined errors', async () => {
        // Test handle with null error
        expect(() => testHandler.handle(null, 'test context')).toThrow();

        // Test handleWithDefault with null error
        const result1 = testHandler.handleWithDefault(null, 'test context', 'default');
        expect(result1).toBe('default');

        // Test safeAsync with an operation that throws null
        const result2 = await safeAsync(async () => {
            throw null;
        }, 'test context', 'default');
        expect(result2).toBe('default');

        // Test safeSync with an operation that throws null
        const result3 = safeSync(() => {
            throw null;
        }, 'test context', 'default');
        expect(result3).toBe('default');
    });

    test('should handle error context correctly', () => {
        const error = new Error('test error');
        const context = 'testFunction';

        // Test that context is added to error message
        expect(() => testHandler.handle(error, context)).toThrow('[TestModule.testFunction] test error');
    });

    test('should handle empty context', () => {
        const error = new Error('test error');

        // Test handle with empty context
        expect(() => testHandler.handle(error, '')).toThrow('[TestModule.] test error');

        // Test handleWithDefault with empty context
        const result = testHandler.handleWithDefault(error, '', 'default');
        expect(result).toBe('default');
    });

    test('should handle custom error types with context', () => {
        const context = 'TestContext';

        // Test ValidationError
        const validationError = createError.ValidationError('validation failed', context);
        expect(validationError).toBeInstanceOf(Errors.ValidationError);
        expect(validationError.context).toBe(context);

        // Test ParseError
        const parseError = createError.ParseError('parse failed', context);
        expect(parseError).toBeInstanceOf(Errors.ParseError);
        expect(parseError.context).toBe(context);

        // Test InferenceError
        const inferenceError = createError.InferenceError('inference failed', context);
        expect(inferenceError).toBeInstanceOf(Errors.InferenceError);
        expect(inferenceError.context).toBe(context);

        // Test PlanningError
        const planningError = createError.PlanningError('planning failed', context);
        expect(planningError).toBeInstanceOf(Errors.PlanningError);
        expect(planningError.context).toBe(context);

        // Test MemoryError
        const memoryError = createError.MemoryError('memory failed', context);
        expect(memoryError).toBeInstanceOf(Errors.MemoryError);
        expect(memoryError.context).toBe(context);
    });

    test('should handle error type checking', () => {
        const validationError = new Errors.ValidationError('validation error');
        const parseError = new Errors.ParseError('parse error');
        const inferenceError = new Errors.InferenceError('inference error');
        const planningError = new Errors.PlanningError('planning error');
        const memoryError = new Errors.MemoryError('memory error');
        const genericError = new Error('generic error');

        // Test validation error checking
        expect(isError.isValidationError(validationError)).toBe(true);
        expect(isError.isValidationError(parseError)).toBe(false);
        expect(isError.isValidationError(genericError)).toBe(false);

        // Test parse error checking
        expect(isError.isParseError(parseError)).toBe(true);
        expect(isError.isParseError(validationError)).toBe(false);
        expect(isError.isParseError(genericError)).toBe(false);

        // Test inference error checking
        expect(isError.isInferenceError(inferenceError)).toBe(true);
        expect(isError.isInferenceError(parseError)).toBe(false);
        expect(isError.isInferenceError(genericError)).toBe(false);

        // Test planning error checking
        expect(isError.isPlanningError(planningError)).toBe(true);
        expect(isError.isPlanningError(inferenceError)).toBe(false);
        expect(isError.isPlanningError(genericError)).toBe(false);

        // Test memory error checking
        expect(isError.isMemoryError(memoryError)).toBe(true);
        expect(isError.isMemoryError(planningError)).toBe(false);
        expect(isError.isMemoryError(genericError)).toBe(false);
    });

    test('should handle module error handler edge cases for safeAsync', async () => {
        const moduleHandler = createModuleErrorHandler('TestModule');

        // Test that all methods exist
        expect(typeof moduleHandler.handle).toBe('function');
        expect(typeof moduleHandler.handleWithDefault).toBe('function');
        expect(typeof moduleHandler.safeAsync).toBe('function');
        expect(typeof moduleHandler.safeSync).toBe('function');

        // Test safeAsync with async function that throws
        const asyncThrowingFunction = async () => {
            throw new Error('async error');
        };
        const result = await moduleHandler.safeAsync(asyncThrowingFunction, 'test context', 'default');
        expect(result).toBe('default');
    });

    test('should handle module error handler edge cases for safeSync', () => {
        const moduleHandler = createModuleErrorHandler('TestModule');

        // Test safeSync with sync function that throws
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
                const innerHandler = createModuleErrorHandler('InnerModule');
                innerHandler.handle(innerError, innerContext);
            } catch (caughtError) {
                const outerHandler = createModuleErrorHandler('OuterModule');
                outerHandler.handle(caughtError, outerContext);
            }
        }).toThrow('[InnerModule.InnerContext] inner error');
    });

    test('should handle very long error messages', () => {
        const longMessage = 'a'.repeat(10000);
        const error = new Error(longMessage);

        // Should handle without issues
        expect(() => testHandler.handle(error, 'test')).toThrow(longMessage);
    });

    test('should handle error objects with circular references', () => {
        const error = new Error('circular error');
        error.self = error;

        // Should handle without infinite recursion
        expect(() => testHandler.handle(error, 'test')).toThrow('circular error');
    });

    test('should preserve original stack traces', () => {
        const error = new Error('test error');
        const _originalStack = error.stack;

        try {
            testHandler.handle(error, 'test context');
        } catch (handledError) {
            expect(handledError.stack || handledError.originalStack).toBeDefined();
        }
    });
});