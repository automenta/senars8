import nlpIntegrationDemo from './nlp-integration-demo.js';

describe('nlp-integration-demo', () => {
    it('should parse natural language inputs into tasks', async () => {
        const assertions = (system) => {
            const tasks = system.introspection.queryTasks({});
            // Check that we have tasks in the system
            expect(tasks.length).toBeGreaterThan(0);
            
            // Check that we have at least one task related to birds and animals
            const nlpTask = tasks.find(t => t.termKey.includes('bird') && t.termKey.includes('animal'));
            expect(nlpTask).toBeDefined();
        };

        await nlpIntegrationDemo({ assertions, postCycleCallback: null });
    }, 15000); // Increase timeout for NLP processing
});