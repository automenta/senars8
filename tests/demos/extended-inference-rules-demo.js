// Category: Reasoning
// Description: Demonstrates the use of a wide range of inference rules, including deduction, induction, and abduction.

import {runDemo} from '../../utils/shared/demo-utils.js';
import {info} from '../../core/utils/logger.js';

async function extendedInferenceRulesDemo(options = {}) {
    const taskDefs = [
        // Premises for deduction
        {sentence: '(mammal --> warm_blooded).', truth: [1.0, 0.9]},
        {sentence: '(dog --> mammal).', truth: [1.0, 0.9]},
        // Premises for induction
        {sentence: '(swan_1 --> white).', truth: [1.0, 0.9]},
        {sentence: '(swan_2 --> white).', truth: [1.0, 0.9]},
        // Premises for abduction
        {sentence: '(wet_grass --> (grass & water)).', truth: [1.0, 0.9]},
        {sentence: 'wet_grass.', truth: [1.0, 0.9]},
        // Question to trigger inference
        {sentence: '(dog --> warm_blooded)?'},
        {sentence: '(swan --> white)?'},
        {sentence: 'water?'},
    ];

    const defaultOptions = {
        cycleCount: 10,
        postCycleCallback: (system) => {
            info("Querying for inferred conclusions...");
            const deduction = system.introspection.queryTasks({termKey: '(dog --> warm_blooded)', punctuation: '.'});
            const induction = system.introspection.queryTasks({termKey: '(swan --> white)', punctuation: '.'});
            const abduction = system.introspection.queryTasks({termKey: 'water', punctuation: '.'});

            info(`Deduced: ${deduction.length > 0}`);
            info(`Induced: ${induction.length > 0}`);
            info(`Abduced: ${abduction.length > 0}`);
        }
    };

    const mergedOptions = {...defaultOptions, ...options};
    return await runDemo('Extended Inference Rules Demo', taskDefs, mergedOptions);
}

export default extendedInferenceRulesDemo;

if (import.meta.url.startsWith('file:')) {
    extendedInferenceRulesDemo().catch(console.error);
}