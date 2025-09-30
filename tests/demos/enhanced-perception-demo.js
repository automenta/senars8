// Category: Perception
// Description: Showcases enhanced perception, processing various event types and sensory inputs into tasks.

import {runSystem} from '../../utils/runner.js';
import {parseTerm} from '../../core/index.js';
import Task from '../../core/core/Task.js';
import {info} from '../../common/services/Logger.js';
import { SystemCommands } from '../../core/system/SystemCommands.js';

async function enhancedPerceptionDemo(options = {}) {
    const taskDefs = [
        {sentence: '(perception_system --> active).', truth: [1.0, 0.9]},
    ];

    const defaultOptions = {
        cycleCount: 2,
        preCycleCallback: async (system) => {
            // Register a custom sensory modality for 'visual' input
            system.perception.registerSensoryModality('visual', async (input) => {
                const term = parseTerm(`(visual_input --> ${input.description})`);
                return [new Task(term, '.', {frequency: input.confidence, confidence: 0.9})];
            });

            // Register a modality for raw text input
            system.perception.registerSensoryModality('text', async (input) => {
                // A simple processor that creates a belief from the text content.
                const term = parseTerm(`<${input}>.`);
                return [new Task(term, '.', {frequency: 1.0, confidence: 0.9})];
            });
        },
        postCycleCallback: async (system) => {
            info("Processing new sensory input...");

            // Process a visual event via command
            await system.commandBus.request(SystemCommands.PROCESS_RAW_INPUT, {
                modality: 'visual',
                input: {description: 'red_ball', confidence: 0.95}
            });
            info("Processed a 'visual' event: red_ball");

            // Process a raw text event via command
            await system.commandBus.request(SystemCommands.PROCESS_RAW_INPUT, {
                modality: 'text',
                input: 'The cat is on the mat.'
            });
            info("Processed a 'text' event.");

            info("Inspecting resulting tasks in memory...");
            const tasks = await system.introspection.queryTasks({});
            const perceptionTasks = tasks.filter(t => t.termKey.includes('visual_input') || t.termKey.includes('cat'));

            info(`Found ${perceptionTasks.length} perception-related tasks:`);
            perceptionTasks.slice(0, 5).forEach(task => {
                info(`  - ${task.termKey}`);
            });
        }
    };

    const mergedOptions = {...defaultOptions, ...options};
    return await runSystem('Enhanced Perception Demo', taskDefs, mergedOptions);
}

export default enhancedPerceptionDemo;

if (import.meta.url.startsWith('file:')) {
    enhancedPerceptionDemo().catch(console.error);
}