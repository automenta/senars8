import {
    runDemo
} from '../shared/demo-utils.js';

async function advancedLMDemo() {
    const taskDefs = [{
        sentence: '(AI --> intelligent_system).',
        truth: [0.95, 0.9]
    }, {
        sentence: '(neural_network --> machine_learning_model).',
        truth: [0.9, 0.85]
    }, {
        sentence: '(symbolic_reasoning --> logical_inference).',
        truth: [0.85, 0.8]
    }, {
        sentence: '(AI --> (&, neural_network, symbolic_reasoning)).',
        truth: [0.8, 0.75]
    }, {
        sentence: '(cognitive_architecture --> AI).',
        truth: [0.75, 0.7]
    }, {
        sentence: '(SeNARS --> cognitive_architecture).',
        truth: [1.0, 0.95]
    }, {
        sentence: '(explain_seNARS)!',
        truth: [1.0, 0.9]
    }, ];

    const postCycleCallback = async (system) => {
        console.log("\nAsking the LM to explain its understanding of SeNARS...");
        const explanation = await system.lm.explain();
        console.log("LM Explanation:", explanation);
    };

    await runDemo('Advanced LM Demo', taskDefs, {
        cycleCount: 3,
        postCycleCallback
    });
}

export default advancedLMDemo;

if (import.meta.url.startsWith('file:')) {
    advancedLMDemo().catch(console.error);
}