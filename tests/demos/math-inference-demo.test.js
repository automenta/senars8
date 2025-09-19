import mathInferenceDemo from './math-inference-demo.js';

describe('math-inference-demo', () => {
    it('should infer that 4 is divisible by 2', async () => {
        const assertions = (system) => {
            const inference = system.introspection.queryTasks({termKey: '(4 --> divisible_by_2)', punctuation: '.'});
            // Expect at least one task matching our query
            expect(inference.length).toBeGreaterThanOrEqual(1);
        };

        await mathInferenceDemo({ assertions, postCycleCallback: null });
    });
});