// Category: Perception
// Description: Showcases enhanced perception, processing various event types and sensory inputs into tasks.

import { runDemo } from '../shared/demo-utils.js';
import { parseTerm } from '../src/parser/parse-utils.js';
import Task from '../src/core/Task.js';

async function enhancedPerceptionDemo() {
    const taskDefs = [
        { sentence: '(perception_system --> active).', truth: [1.0, 0.9] },
    ];

    const preCycleCallback = async (system) => {
        // Register a custom sensory modality for 'visual' input
        system.perception.registerSensoryModality('visual', async (input) => {
            const term = parseTerm(`(visual_input --> ${input.description})`);
            return [new Task(term, '.', { frequency: input.confidence, confidence: 0.9 })];
        });
    };

    const postCycleCallback = async (system) => {
        console.log("\nProcessing new sensory input...");

        // Process a visual event
        await system.perception.processSensoryInput('visual', { description: 'red_ball', confidence: 0.95 });
        console.log("Processed a 'visual' event: red_ball");

        // Process a raw text event
        await system.perception.processEvents([{ type: 'text', content: 'The cat is on the mat.' }]);
        console.log("Processed a 'text' event.");

        console.log("\nInspecting resulting tasks in memory...");
        const tasks = system.introspection.queryTasks({});
        const perceptionTasks = tasks.filter(t => t.termKey.includes('visual_input') || t.termKey.includes('cat'));

        console.log(`Found ${perceptionTasks.length} perception-related tasks:`);
        perceptionTasks.forEach(task => {
            console.log(`  - ${task.termKey}`);
        });
    };

    await runDemo('Enhanced Perception Demo', taskDefs, {
        cycleCount: 2,
        preCycleCallback,
        postCycleCallback
    });
}

export default enhancedPerceptionDemo;

if (import.meta.url.startsWith('file:')) {
    enhancedPerceptionDemo().catch(console.error);
}