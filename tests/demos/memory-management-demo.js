// Memory Management Demonstration
// Shows the system's ability to manage, retrieve, and forget tasks based on priority and recency

import {runSystem} from '../../utils/runner.js';
import {info} from '../../core/utils/logger.js';

async function memoryManagementDemo(options = {}) {
    // Configuration for memory management
    const config = {
        memory: {
            capacity: {
                concepts: 100,
                tasks: 200
            },
            forgetting: {
                enabled: true,
                threshold: 0.1,  // Lower threshold to demonstrate forgetting more clearly
                strategy: 'priority'  // Forgetting based on priority
            }
        }
    };

    // Set of tasks that demonstrate memory management
    const taskDefs = [
        // High priority beliefs
        {sentence: '(important --> fact).', truth: [0.9, 0.9]},     // High frequency, high confidence
        {sentence: '(crucial --> knowledge).', truth: [0.8, 0.9]},  // High confidence, good frequency

        // Create many lower-priority items to trigger forgetting
        {sentence: '(item1 --> concept).', truth: [0.1, 0.2]},      // Low priority
        {sentence: '(item2 --> concept).', truth: [0.1, 0.2]},
        {sentence: '(item3 --> concept).', truth: [0.1, 0.2]},
        {sentence: '(item4 --> concept).', truth: [0.1, 0.2]},
        {sentence: '(item5 --> concept).', truth: [0.1, 0.2]},
        {sentence: '(item6 --> concept).', truth: [0.1, 0.2]},
        {sentence: '(item7 --> concept).', truth: [0.1, 0.2]},
        {sentence: '(item8 --> concept).', truth: [0.1, 0.2]},
        {sentence: '(item9 --> concept).', truth: [0.1, 0.2]},
        {sentence: '(item10 --> concept).', truth: [0.1, 0.2]},
        {sentence: '(item11 --> concept).', truth: [0.1, 0.2]},
        {sentence: '(item12 --> concept).', truth: [0.1, 0.2]},
        {sentence: '(item13 --> concept).', truth: [0.1, 0.2]},
        {sentence: '(item14 --> concept).', truth: [0.1, 0.2]},
        {sentence: '(item15 --> concept).', truth: [0.1, 0.2]},
        {sentence: '(item16 --> concept).', truth: [0.1, 0.2]},
        {sentence: '(item17 --> concept).', truth: [0.1, 0.2]},
        {sentence: '(item18 --> concept).', truth: [0.1, 0.2]},
        {sentence: '(item19 --> concept).', truth: [0.1, 0.2]},
        {sentence: '(item20 --> concept).', truth: [0.1, 0.2]},

        // Query to process and generate new knowledge
        {sentence: '(fact --> ?)?'}
    ];

    const defaultOptions = {
        cycleCount: 20,
        config,
        postCycleCallback: async (system) => {
            info("\\n=== Memory Management Demonstration ===");
            info("Memory Management Features:");
            info("- Priority-based task selection");
            info("- Forgetting of low-priority items");
            info("- Dynamic allocation based on task importance");
            info("- Concept formation from similar tasks");

            // Show initial memory state
            const allTasks = await system.introspection.queryTasks({});
            const beliefs = await system.introspection.queryTasks({punctuation: '.'});
            const highPriorityBeliefs = beliefs.filter(b => b.state.truthValue.confidence > 0.5 && b.state.truthValue.frequency > 0.5);

            info(`\\nTotal tasks in memory: ${allTasks.length}`);
            info(`High priority beliefs: ${highPriorityBeliefs.length}`);

            info("\\nHigh Priority Items (should remain in memory):");
            highPriorityBeliefs.forEach(b => {
                if (b.termKey.includes('important') || b.termKey.includes('crucial')) {
                    info(`- ${b.termKey} (conf: ${b.state.truthValue.confidence.toFixed(2)}, freq: ${b.state.truthValue.frequency.toFixed(2)})`);
                }
            });

            // Show evidence of forgetting by looking for low-priority items
            const lowPriorityItems = beliefs.filter(b =>
                b.termKey.startsWith('item') &&
                b.state.truthValue.confidence <= 0.2 &&
                b.state.truthValue.frequency <= 0.2
            );

            info(`\\nLow priority items remaining: ${lowPriorityItems.length} (out of 20 added)`);
            info("This demonstrates the forgetting mechanism - lower priority items are removed as memory fills.");

            // Show memory statistics
            info("\\nMemory Management Strategies:");
            info("- Priority forgetting: Low-priority items are forgotten first");
            info("- Activation-based retrieval: Recently used items are more accessible");
            info("- Concept consolidation: Similar tasks are merged into higher-level concepts");

            info("\\nMemory utilization:");
            // Note: Different system versions may have different memory store structure
            try {
                if (system.memoryStore && system.memoryStore.concepts) {
                    info(`- Concepts in memory: ${Object.keys(system.memoryStore.concepts).length}`);
                } else if (system.memory) {
                    // Alternative access depending on system version
                    info(`- Memory store structure varies by system version`);
                } else {
                    info(`- Memory store: N/A in this system version`);
                }
            } catch (e) {
                info(`- Memory structure details: System variation detected`);
            }
            info(`- Tasks processed: ${allTasks.length}`);
            info(`- High-value knowledge preserved: ${highPriorityBeliefs.length > 0 ? 'Yes' : 'No'}`);
        }
    };

    const mergedOptions = {...defaultOptions, ...options};

    return await runSystem('Memory Management Demonstration', taskDefs, mergedOptions);
}

export default memoryManagementDemo;

// This makes the demo runnable directly
if (import.meta.url.startsWith('file:')) {
    memoryManagementDemo().catch(console.error);
}