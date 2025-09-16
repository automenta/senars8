// Category: Showcase
// Description: A comprehensive showcase of the SeNARS system's core capabilities, from basic reasoning to advanced planning and learning.

import { runDemo } from '../shared/demo-utils.js';
import { info } from '../src/utils/logger.js';

async function showcaseDemo() {
    info("--- 🚀 Welcome to the SeNARS Showcase! ---");
    info("This demo will walk you through the core capabilities of the system.");

    // 1. Basic Reasoning
    info("\n--- 1. Basic Reasoning: Inferring new knowledge ---");
    const reasoningTasks = [
        { sentence: '(cat --> mammal).', truth: [1.0, 0.9] },
        { sentence: '(mammal --> animal).', truth: [1.0, 0.9] },
        { sentence: '(cat --> animal)?' }
    ];
    await runDemo('Basic Reasoning', reasoningTasks, {
        cycleCount: 3,
        postCycleCallback: (system) => {
            const conclusion = system.introspection.queryTasks({ termKey: '(cat --> animal)', punctuation: '.' });
            if (conclusion.length > 0) {
                info("✅ Inference successful: The system concluded that a cat is an animal.");
            } else {
                info("❌ Inference failed.");
            }
        }
    });

    // 2. Contradiction Resolution
    info("\n--- 2. Contradiction Resolution: Handling conflicting information ---");
    const contradictionTasks = [
        { sentence: '(sun --> hot).', truth: [1.0, 0.99] },
        { sentence: '(sun --> cold).', truth: [0.8, 0.8] } // Contradictory belief
    ];
    await runDemo('Contradiction Resolution', contradictionTasks, {
        cycleCount: 5,
        postCycleCallback: (system) => {
            const contradictions = system.introspection.getContradictions();
            if (contradictions.length === 0) {
                info("✅ Contradiction resolved: The system identified and handled the conflict.");
            } else {
                info("❌ Contradiction resolution failed.");
            }
        }
    });

    // 3. Simple Planning
    info("\n--- 3. Planning: Creating a sequence of actions to achieve a goal ---");
    const planningTasks = [
        { sentence: '((get_cup & get_water) ==> have_drink).', truth: [1.0, 0.9] },
        { sentence: 'have_drink!', truth: [1.0, 0.9] }
    ];
    const actionHandlers = [
        { name: 'get_cup', handler: async () => info("Action: Getting a cup.") },
        { name: 'get_water', handler: async () => info("Action: Getting water.") },
    ];
    await runDemo('Simple Planning', planningTasks, {
        cycleCount: 8,
        actionHandlers,
        postCycleCallback: (system) => {
            const plan = system.introspection.getPlan();
            if (plan && plan.steps.length > 0) {
                info(`✅ Planning successful: Generated a ${plan.steps.length}-step plan.`);
            } else {
                info("❌ Planning failed.");
            }
        }
    });

    // 4. NLP Integration
    info("\n--- 4. NLP Integration: Understanding natural language ---");
    const nlpTasks = [];
    await runDemo('NLP Integration', nlpTasks, {
        cycleCount: 1,
        preCycleCallback: async (system) => {
            const nl = "A car is a vehicle.";
            info(`Parsing natural language: "${nl}"`);
            const parsed = await system.lm.nlp.parse(nl);
            system.addTasks(parsed);
        },
        postCycleCallback: (system) => {
            const task = system.introspection.queryTasks({ termKey: '(car --> vehicle)' });
            if (task.length > 0) {
                info("✅ NLP successful: The system correctly parsed the sentence.");
            } else {
                info("❌ NLP failed.");
            }
        }
    });

    info("\n--- 🚀 Showcase Complete! ---");
}

export default showcaseDemo;

if (import.meta.url.startsWith('file:')) {
    showcaseDemo().catch(console.error);
}
