import basicDemo from './basic-demo.js';

describe('basic-demo', () => {
    it('should infer that a bird is living', async () => {
        const assertions = (system) => {
            const inferred = system.introspection.queryTasks({ term: 'living', punctuation: '.' });
            expect(inferred).toHaveLength(1);
            expect(inferred[0].term.toString()).toBe('living');
        };

        await basicDemo({ assertions, postCycleCallback: null });
    });
});
