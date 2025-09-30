// Category: Showcase
// Description: A comprehensive showcase of the SeNARS system's core capabilities, from basic reasoning to advanced planning and learning.

import {runSystem} from '../../utils/runner.js';
import {info} from '../../common/services/Logger.js';
import {SystemCommands} from '../../core/system/SystemCommands.js';

/**
 * A unified showcase demo that demonstrates core system capabilities.
 * Can be run as a standalone example or as a unit test.
 *
 * @param {object} options - Configuration options
 * @param {Function} [options.assertions] - Optional assertions for testing
 * @param {Function} [options.preCycleCallback] - Optional callback before cycles run
 * @param {Function} [options.postCycleCallback] - Optional callback after cycles run
 * @returns {Promise<System>} The system instance after running
 */
async function showcaseDemo(options = {}) {
    // Define the showcase sections as steps
    const showcaseSteps = [
        {
            name: 'Basic Reasoning',
            tasks: [
                {sentence: '(cat --> mammal).', truth: [1.0, 0.9]},
                {sentence: '(mammal --> animal).', truth: [1.0, 0.9]},
                {sentence: '(cat --> animal)?'}
            ],
            cycleCount: 3,
            postCycleCallback: (system) => {
                const conclusion = system.introspection.queryTasks({termKey: '(cat --> animal)', punctuation: '.'});
                if (conclusion.length > 0) {
                    info("✅ Inference successful: The system concluded that a cat is an animal.");
                } else {
                    info("❌ Inference failed.");
                }
            }
        },
        {
            name: 'Contradiction Resolution',
            tasks: [
                {sentence: '(sun --> hot).', truth: [1.0, 0.99]},
                {sentence: '(sun --> cold).', truth: [0.8, 0.8]} // Contradictory belief
            ],
            cycleCount: 5,
            postCycleCallback: (system) => {
                // Check for contradictions by looking for conflicting beliefs
                const hotBelief = system.introspection.queryTasks({termKey: '(sun --> hot)', punctuation: '.'});
                const coldBelief = system.introspection.queryTasks({termKey: '(sun --> cold)', punctuation: '.'});

                // If both beliefs exist with high confidence, there's still a contradiction
                const hasHot = hotBelief.length > 0 && hotBelief[0].state.truthValue.confidence > 0.8;
                const hasCold = coldBelief.length > 0 && coldBelief[0].state.truthValue.confidence > 0.8;

                if (!(hasHot && hasCold)) {
                    info("✅ Contradiction resolved: The system identified and handled the conflict.");
                } else {
                    info("❌ Contradiction resolution failed.");
                }
            }
        },
        {
            name: 'Simple Planning',
            tasks: [
                {sentence: '((get_cup & get_water) ==> have_drink).', truth: [1.0, 0.9]},
                {sentence: 'have_drink!', truth: [1.0, 0.9]}
            ],
            actionHandlers: [
                {name: 'get_cup', handler: async () => info("Action: Getting a cup.")},
                {name: 'get_water', handler: async () => info("Action: Getting water.")},
            ],
            cycleCount: 8,
            postCycleCallback: (system) => {
                const plan = system.introspection.getPlan();
                if (plan && plan.steps.length > 0) {
                    info(`✅ Planning successful: Generated a ${plan.steps.length}-step plan.`);
                } else {
                    info("❌ Planning failed.");
                }
            }
        },
        {
            name: 'NLP Integration',
            tasks: [],
            cycleCount: 1,
            preCycleCallback: async (system) => {
                const nl = "A car is a vehicle.";
                info(`Parsing natural language: "${nl}"`);
                const parsed = await system.commandBus.request(SystemCommands.LM_NLP_PARSE, nl);
                system.addTasks(parsed);
            },
            postCycleCallback: (system) => {
                const task = system.introspection.queryTasks({termKey: '(car --> vehicle)'});
                if (task.length > 0) {
                    info("✅ NLP successful: The system correctly parsed the sentence.");
                } else {
                    info("❌ NLP failed.");
                }
            }
        }
    ];

    // Run each step of the showcase
    info("--- 🚀 Welcome to the SeNARS Showcase! ---");
    info("This demo will walk you through the core capabilities of the system.");

    let system;
    for (const [index, step] of showcaseSteps.entries()) {
        info(`\n--- ${index + 1}. ${step.name}: ${getStepDescription(step.name)} ---`);

        // Merge step options with any provided options
        const stepOptions = {
            cycleCount: step.cycleCount,
            actionHandlers: step.actionHandlers || [],
            preCycleCallback: step.preCycleCallback,
            postCycleCallback: step.postCycleCallback,
            ...options
        };

        system = await runSystem(step.name, step.tasks, stepOptions);
    }

    info("\n--- 🚀 Showcase Complete! ---");

    // Return the final system instance
    return system;
}

/**
 * Get a description for a showcase step
 * @param {string} stepName - The name of the step
 * @returns {string} The description
 */
function getStepDescription(stepName) {
    const descriptions = {
        'Basic Reasoning': 'Inferring new knowledge',
        'Contradiction Resolution': 'Handling conflicting information',
        'Simple Planning': 'Creating a sequence of actions to achieve a goal',
        'NLP Integration': 'Understanding natural language'
    };
    return descriptions[stepName] || '';
}

export default showcaseDemo;

// This makes the demo runnable directly
if (import.meta.url.startsWith('file:')) {
    showcaseDemo().catch(console.error);
}

// This makes it testable
// In your test file, you would import and call:
// await showcaseDemo({ assertions: (system) => { /* your assertions */ } });
