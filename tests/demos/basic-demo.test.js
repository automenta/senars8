import basicDemo from './basic-demo.js';

describe('basic-demo', () => {
    it('should infer that a bird is living', async () => {
        const assertions = (system) => {
            const inferred = system.introspection.queryTasks({ term: 'living', punctuation: '.' });
            // Expect at least one task with 'living' as the term
            expect(inferred.length).toBeGreaterThan(0);
            // Check that at least one of the tasks has 'living' as the term key
            const livingTasks = inferred.filter(task => task.termKey === 'living');
            expect(livingTasks.length).toBeGreaterThan(0);
        };

        await basicDemo({ assertions, postCycleCallback: null });
    });
});
