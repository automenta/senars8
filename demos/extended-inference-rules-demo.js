// Category: Reasoning
// Description: Demonstrates the use of a wide range of inference rules, including deduction, induction, and abduction.

import { runDemo } from '../shared/demo-utils.js';

async function extendedInferenceRulesDemo() {
    const taskDefs = [
        // Premises for deduction
        { sentence: '(mammal --> warm_blooded).', truth: [1.0, 0.9] },
        { sentence: '(dog --> mammal).', truth: [1.0, 0.9] },
        // Premises for induction
        { sentence: '(swan_1 --> white).', truth: [1.0, 0.9] },
        { sentence: '(swan_2 --> white).', truth: [1.0, 0.9] },
        // Premises for abduction
        { sentence: '(wet_grass --> (grass & water)).', truth: [1.0, 0.9] },
        { sentence: 'wet_grass.', truth: [1.0, 0.9] },
        // Question to trigger inference
        { sentence: '(dog --> warm_blooded)?' },
        { sentence: '(swan --> white)?' },
        { sentence: 'water?' },
    ];

    const postCycleCallback = (system) => {
        console.log("\nQuerying for inferred conclusions...");
        const deduction = system.introspection.queryTasks({ termKey: '(dog --> warm_blooded)', punctuation: '.' });
        const induction = system.introspection.queryTasks({ termKey: '(swan --> white)', punctuation: '.' });
        const abduction = system.introspection.queryTasks({ termKey: 'water', punctuation: '.' });

        console.log(`Deduced: ${deduction.length > 0}`);
        console.log(`Induced: ${induction.length > 0}`);
        console.log(`Abduced: ${abduction.length > 0}`);
    };

    await runDemo('Extended Inference Rules Demo', taskDefs, {
        cycleCount: 10,
        postCycleCallback
    });
}

export default extendedInferenceRulesDemo;

if (import.meta.url.startsWith('file:')) {
    extendedInferenceRulesDemo().catch(console.error);
}