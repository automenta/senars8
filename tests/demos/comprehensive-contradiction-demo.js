// Category: Reasoning
// Description: A comprehensive demonstration of how the system handles contradictions, from simple resolution to generating clarifying questions.

import {runDemo} from '../shared/demo-utils.js';
import {info} from '../src/utils/logger.js';

async function comprehensiveContradictionDemo() {
    info("--- 🚀 Welcome to the Comprehensive Contradiction Demo! ---");

    // 1. Simple Contradiction Resolution
    info("\n--- 1. Simple Contradiction Resolution: Revising truth values ---");
    const simpleContradictionTasks = [
        {sentence: '(bird --> can_fly).', truth: [0.9, 0.9]},
        {sentence: '(penguin --> bird).', truth: [1.0, 0.9]},
        {sentence: '(penguin --> not_fly).', truth: [1.0, 0.9]},
    ];
    await runDemo('Simple Contradiction Resolution', simpleContradictionTasks, {
        cycleCount: 8,
        postCycleCallback: (system) => {
            info("\nChecking for resolved contradictions...");
            const contradictions = system.introspection.getContradictions();
            if (contradictions.length === 0) {
                info("✅ Contradiction successfully resolved by revising beliefs.");
            } else {
                info(`❌ Found ${contradictions.length} unresolved contradictions.`);
            }
        }
    });

    // 2. Enhanced Contradiction Resolution
    info("\n--- 2. Enhanced Contradiction Resolution: Asking clarifying questions ---");
    const enhancedContradictionTasks = [
        {sentence: '(all_swans --> white).', truth: [0.9, 0.8]},
        {sentence: '(<black_swan> --> swan).', truth: [1.0, 0.95]},
        {sentence: '(<black_swan> --> black).', truth: [1.0, 0.95]},
    ];
    await runDemo('Enhanced Contradiction Resolution', enhancedContradictionTasks, {
        cycleCount: 7,
        postCycleCallback: (system) => {
            info("\nChecking for meta-cognitive tasks (e.g., questions for clarification)...");
            const metaTasks = system.introspection.queryTasks({isMeta: true});
            if (metaTasks.length > 0) {
                info(`✅ Found ${metaTasks.length} meta-tasks, showing advanced resolution:`);
                metaTasks.forEach(task => {
                    info(`  - ${task.termKey}${task.punctuation}`);
                });
            } else {
                info("❌ No meta-tasks generated for clarification.");
            }
        }
    });

    info("\n--- 🚀 Comprehensive Contradiction Demo Complete! ---");
}

export default comprehensiveContradictionDemo;

if (import.meta.url.startsWith('file:')) {
    comprehensiveContradictionDemo().catch(console.error);
}
