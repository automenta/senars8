import {
    createInferenceError,
    createMemoryError,
    createModuleErrorHandler,
    createParseError,
    createPlanningError,
    createValidationError,
    handleError,
    handleErrorWithDefault,
    InferenceError,
    isInferenceError,
    isMemoryError,
    isParseError,
    isPlanningError,
    isValidationError,
    MemoryError,
    ParseError,
    PlanningError,
    safeAsync,
    safeSync,
    ValidationError
} from '../../src/utils/errorHandler.js';

describe('Error Handler - Edge Cases', () => {
    test('should handle null and undefined errors', async () => {
        // Test handleError with null error
        expect(() => handleError(null, 'test context')).toThrow();

        // Test handleErrorWithDefault with null error
        const result1 = handleErrorWithDefault(null, 'test context', 'default');
        expect(result1).toBe('default');

        // Test safeAsync with null operation
        const result2 = await safeAsync(null, 'test context', 'default');
        expect(result2).toBe('default');

        // Test safeSync with null operation
        const result3 = safeSync(null, 'test context', 'default');
        expect(result3).toBe('default');
    });

    test('should handle error context correctly', () => {
        const error = new Error('test error');
        const context = 'TestModule.testFunction';

        // Test that context is added to error message
        expect(() => handleError(error, context)).toThrow('[TestModule.testFunction] test error');
    });

    test('should handle empty context', () => {
        const error = new Error('test error');

        // Test handleError with empty context
        expect(() => handleError(error, '')).toThrow('test error');

        // Test handleErrorWithDefault with empty context
        const result = handleErrorWithDefault(error, '', 'default');
        expect(result).toBe('default');
    });

    test('should handle custom error types with context', () => {
        const context = 'TestContext';

        // Test ValidationError
        const validationError = createValidationError('validation failed', context);
        expect(validationError).toBeInstanceOf(ValidationError);
        expect(validationError.context).toBe(context);

        // Test ParseError
        const parseError = createParseError('parse failed', context);
        expect(parseError).toBeInstanceOf(ParseError);
        expect(parseError.context).toBe(context);

        // Test InferenceError
        const inferenceError = createInferenceError('inference failed', context);
        expect(inferenceError).toBeInstanceOf(InferenceError);
        expect(inferenceError.context).toBe(context);

        // Test PlanningError
        const planningError = createPlanningError('planning failed', context);
        expect(planningError).toBeInstanceOf(PlanningError);
        expect(planningError.context).toBe(context);

        // Test MemoryError
        const memoryError = createMemoryError('memory failed', context);
        expect(memoryError).toBeInstanceOf(MemoryError);
        expect(memoryError.context).toBe(context);
    });

    test('should handle error type checking', () => {
        const validationError = new ValidationError('validation error');
        const parseError = new ParseError('parse error');
        const inferenceError = new InferenceError('inference error');
        const planningError = new PlanningError('planning error');
        const memoryError = new MemoryError('memory error');
        const genericError = new Error('generic error');

        // Test validation error checking
        expect(isValidationError(validationError)).toBe(true);
        expect(isValidationError(parseError)).toBe(false);
        expect(isValidationError(genericError)).toBe(false);

        // Test parse error checking
        expect(isParseError(parseError)).toBe(true);
        expect(isParseError(validationError)).toBe(false);
        expect(isParseError(genericError)).toBe(false);

        // Test inference error checking
        expect(isInferenceError(inferenceError)).toBe(true);
        expect(isInferenceError(parseError)).toBe(false);
        expect(isInferenceError(genericError)).toBe(false);

        // Test planning error checking
        expect(isPlanningError(planningError)).toBe(true);
        expect(isPlanningError(inferenceError)).toBe(false);
        expect(isPlanningError(genericError)).toBe(false);

        // Test memory error checking
        expect(isMemoryError(memoryError)).toBe(true);
        expect(isMemoryError(planningError)).toBe(false);
        expect(isMemoryError(genericError)).toBe(false);
    });

    test('should handle module error handler edge cases', () => {
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
        return moduleHandler.safeAsync(asyncThrowingFunction, 'test context', 'default')
            .then(result => {
                expect(result).toBe('default');
            });

        // Test safeSync with sync function that throws
        const syncThrowingFunction = () => {
            throw new Error('sync error');
        };
        const syncResult = moduleHandler.safeSync(syncThrowingFunction, 'test context', 'default');
        expect(syncResult).toBe('default');
    });

    test('should handle nested error handling', async () => {
        // Test error handling within error handling
        const innerError = new Error('inner error');
        const outerContext = 'OuterContext';
        const innerContext = 'InnerContext';

        // This should not cause infinite recursion
        expect(() => {
            try {
                handleError(innerError, innerContext);
            } catch (caughtError) {
                handleError(caughtError, outerContext);
            }
        }).not.toThrow();
    });

    test('should handle very long error messages', () => {
        const longMessage = 'a'.repeat(10000);
        const error = new Error(longMessage);

        // Should handle without issues
        expect(() => handleError(error, 'test')).toThrow(longMessage);
    });

    test('should handle error objects with circular references', () => {
        const error = new Error('circular error');
        // Create circular reference
        error.self = error;

        // Should handle without infinite recursion
        expect(() => handleError(error, 'test')).toThrow('circular error');
    });

    test('should preserve original stack traces', () => {
        const error = new Error('test error');
        const _originalStack = error.stack;

        try {
            handleError(error, 'test context');
        } catch (handledError) {
            // Should preserve original stack or create originalStack property
            expect(handledError.stack || handledError.originalStack).toBeDefined();
        }
    });
});