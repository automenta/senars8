import showcaseDemo from './showcase-demo.js';

describe('showcase-demo', () => {
    it('should run the showcase demo without errors', async () => {
        // This test verifies that the showcase demo can run without throwing errors
        // In a real scenario, you might want to add specific assertions for each step
        
        const assertions = (system) => {
            // Add general assertions about the system state after running the showcase
            expect(system).toBeDefined();
            expect(system.introspection).toBeDefined();
        };

        await showcaseDemo({ assertions });
    }, 30000); // Increase timeout for this comprehensive demo
});