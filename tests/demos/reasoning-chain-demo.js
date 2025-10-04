// Reasoning Chain Demonstration
// Shows how the system performs multi-step reasoning

import {runSystem} from '../../utils/runner.js';
import {info} from '../../core/utils/logger.js';

async function reasoningChainDemo(options = {}) {
    // Set of tasks that demonstrate reasoning chains
    const taskDefs = [
        // Establish some basic facts
        {sentence: '(bird --> animal).', truth: [1.0, 0.9]},       // Birds are animals
        {sentence: '(animal --> living).', truth: [1.0, 0.9]},     // Animals are living things
        {sentence: '(living --> mortal).', truth: [1.0, 0.9]},     // Living things are mortal
        {sentence: 'bird.', truth: [1.0, 0.9]},                    // This is a bird
        // Query about distant relationship
        {sentence: '(mortal --> ?)?'}                               // Is a bird mortal?
    ];

    const defaultOptions = {
        cycleCount: 10,
        postCycleCallback: async (system) => {
            info("\\n=== Reasoning Chain Demonstration ===");
            info("Knowledge Base:");
            info("1. (bird --> animal) - Birds are animals");
            info("2. (animal --> living) - Animals are living things");
            info("3. (living --> mortal) - Living things are mortal");
            info("4. bird - This is a bird");
            info("\\nReasoning Process:");
            info("Step 1: bird + (bird --> animal) => animal");
            info("Step 2: animal + (animal --> living) => living");
            info("Step 3: living + (living --> mortal) => mortal");
            info("\\nResult: Through multi-step reasoning, the system deduces that 'bird' is 'mortal'.");
            
            // Show what's in the memory
            const beliefs = await system.introspection.queryTasks({punctuation: '.'});
            const goals = await system.introspection.queryTasks({punctuation: '!'});
            const questions = await system.introspection.queryTasks({punctuation: '?'});
            
            info(`\\nCurrent beliefs in memory: ${beliefs.length}`);
            info(`Current goals in memory: ${goals.length}`);
            info(`Current questions in memory: ${questions.length}`);
            
            // Show the reasoning chain
            beliefs.filter(b => b.termKey.includes('mortal')).forEach(b => {
                info(`Inferred: ${b.termKey} with confidence: ${b.state.truthValue.confidence.toFixed(2)}`);
            });
        }
    };

    const mergedOptions = {...defaultOptions, ...options};

    return await runSystem('Reasoning Chain Demonstration', taskDefs, mergedOptions);
}

export default reasoningChainDemo;

// This makes the demo runnable directly
if (import.meta.url.startsWith('file:')) {
    reasoningChainDemo().catch(console.error);
}