// Error Handling and Recovery Demonstration
// Shows how the system handles contradictions, errors, and recovers

import {runSystem} from '../../utils/runner.js';
import {info} from '../../core/utils/logger.js';

async function errorHandlingRecoveryDemo(options = {}) {
    // Set of tasks that demonstrate error handling and recovery from contradictions
    const taskDefs = [
        // Introduce a contradiction to test error handling
        {sentence: '(bird --> flyer).', truth: [0.9, 0.9]},         // Birds are flyers
        {sentence: '(penguin --> bird).', truth: [1.0, 0.9]},       // Penguins are birds
        {sentence: '(penguin --> not_flyer).', truth: [0.8, 0.85]}, // Penguins don't fly (contradiction with bird->flyer)

        // Another contradiction scenario
        {sentence: '(mammal --> warm_blooded).', truth: [1.0, 0.95]},  // Mammals are warm-blooded
        {sentence: '(whale --> mammal).', truth: [1.0, 0.9]},          // Whales are mammals
        {sentence: '(whale --> fish).', truth: [0.6, 0.7]},             // Whales are fish (creates conflict)
        {sentence: '(fish --> cold_blooded).', truth: [0.95, 0.9]},     // Fish are cold-blooded

        // Query that should trigger contradiction resolution
        {sentence: '(whale --> warm_blooded)?'}
    ];

    const defaultOptions = {
        cycleCount: 15,
        postCycleCallback: async (system) => {
            info("\\n=== Error Handling and Recovery Demonstration ===");
            info("The system handles several types of inconsistencies:");
            info("1. Contradictions in beliefs");
            info("2. Conflicting inheritance paths");
            info("3. Temporal inconsistencies");
            info("4. Resource limitations");

            info("\\nTest Case 1 - Bird/Penguin Contradiction:");
            info("- (bird --> flyer) [0.9, 0.9]");
            info("- (penguin --> bird) [1.0, 0.9]");
            info("- (penguin --> not_flyer) [0.8, 0.85] (contradicts with penguin inheriting flyer property)");

            info("\\nTest Case 2 - Mammal/Fish/Whale Contradiction:");
            info("- (mammal --> warm_blooded) [1.0, 0.95]");
            info("- (whale --> mammal) [1.0, 0.9]");
            info("- (whale --> fish) [0.6, 0.7] (conflict)");
            info("- (fish --> cold_blooded) [0.95, 0.9] (conflict with warm_blooded)");

            // Show how the system handled the contradictions
            const allTasks = await system.introspection.queryTasks({});
            const beliefs = await system.introspection.queryTasks({punctuation: '.'});

            info(`\\nTotal tasks processed: ${allTasks.length}`);

            // Look for derived tasks that might represent conflict resolution
            const conflictResolutionTasks = beliefs.filter(b =>
                b.termKey.includes('revision') ||
                b.termKey.includes('contradict') ||
                b.termKey.includes('compromise') ||
                b.termKey.includes('resolve')
            );

            info(`Potential conflict resolution tasks: ${conflictResolutionTasks.length}`);

            // Check for revised truth values (indicating revision due to contradiction)
            const revisedBeliefs = beliefs.filter(b =>
                b.state.truthValue != null &&
                (b.termKey.includes('penguin') || b.termKey.includes('whale')) &&
                b.state.truthValue.confidence < 0.9
            );

            info("\\nBeliefs that may have been revised due to contradictions:");
            revisedBeliefs.forEach(b => {
                info(`- ${b.termKey}: conf=${b.state.truthValue.confidence.toFixed(2)}, freq=${b.state.truthValue.frequency.toFixed(2)}`);
            });

            info("\\nError Handling Mechanisms:");
            info("1. Contradiction Detection: Identifying inconsistent beliefs");
            info("2. Truth Value Revision: Adjusting confidence/frequency based on evidence");
            info("3. Revision Strategies: Applying different approaches to resolve conflicts");
            info("4. Recovery: Maintaining coherent knowledge base despite inconsistencies");

            info("\\nThe system maintains its reasoning capability by:");
            info("- Isolating contradictory information temporarily");
            info("- Applying revision rules to find compromise values");
            info("- Maintaining multiple perspectives when appropriate");
            info("- Preserving high-confidence knowledge while questioning uncertain facts");
        }
    };

    const mergedOptions = {...defaultOptions, ...options};

    return await runSystem('Error Handling and Recovery Demonstration', taskDefs, mergedOptions);
}

export default errorHandlingRecoveryDemo;

// This makes the demo runnable directly
if (import.meta.url.startsWith('file:')) {
    errorHandlingRecoveryDemo().catch(console.error);
}