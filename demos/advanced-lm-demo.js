const System = require('../src/system/System');
const { createTask } = require('./demo-utils');
const LM = require('../src/lm/LM');

/**
 * Advanced LM Capabilities Demo
 * Demonstrates the system's advanced language model capabilities for hypothesis generation and explanation.
 */
async function advancedLMDemo() {
    console.log("=== Advanced LM Capabilities Demo ===\n");

    const system = new System();
    await system.initialize();

    // Initialize LM for direct testing
    const lm = new LM();

    // Add initial knowledge about AI systems
    const taskDefs = [
        {termKey: '(AI --> intelligent_system)', punctuation: '.', truthValue: {frequency: 0.95, confidence: 0.9}},
        {
            termKey: '(neural_network --> machine_learning_model)',
            punctuation: '.',
            truthValue: {frequency: 0.9, confidence: 0.85}
        },
        {
            termKey: '(symbolic_reasoning --> logical_inference)',
            punctuation: '.',
            truthValue: {frequency: 0.85, confidence: 0.8}
        },
        {
            termKey: '(AI --> (&, neural_network, symbolic_reasoning))',
            punctuation: '.',
            truthValue: {frequency: 0.8, confidence: 0.75}
        },
        {termKey: '(cognitive_architecture --> AI)', punctuation: '.', truthValue: {frequency: 0.75, confidence: 0.7}},
        {
            termKey: '(SeNARS --> cognitive_architecture)',
            punctuation: '.',
            truthValue: {frequency: 1.0, confidence: 0.95}
        },
        {termKey: '(explain_seNARS)', punctuation: '!', truthValue: {frequency: 1.0, confidence: 0.9}}
    ];

    // Create tasks and filter out any that failed to parse
    const tasks = taskDefs.map(def => createTask(def.termKey, def.punctuation, def.truthValue)).filter(Boolean);

    if (tasks.length === 0) {
        console.log("No valid tasks could be created. Exiting demo.");
        return;
    }

    await system.addTasks(tasks);

    console.log("Running 3 cognitive cycles to demonstrate advanced LM capabilities...\n");

    for (let i = 0; i < 3; i++) {
        const result = await system.runCycle();
        console.log(`Cycle ${i + 1}:`);
        console.log(`  - Derived Tasks: ${result.derivedTasks}`);
        console.log(`  - Contradictions: ${result.contradictions}`);
        console.log(`  - Meta Tasks: ${result.metaTasks}`);
        console.log();
    }

    // Direct LM testing
    console.log("\n=== Direct LM Testing ===");

    // Test comprehensive explanation
    console.log("\n1. Comprehensive explanation of 'SeNARS':");
    try {
        const compExplanation = await lm.explainComprehensive('SeNARS', 'cognitive architecture');
        console.log("  Technical:", compExplanation.perspectives.technical || "N/A");
        console.log("  Practical:", compExplanation.perspectives.practical || "N/A");
        console.log("  Historical:", compExplanation.perspectives.historical || "N/A");
        console.log("  Synthesis:", compExplanation.synthesis || "N/A");
    } catch (error) {
        console.log("  Error:", error.message);
    }

    // Test visual analogies
    console.log("\n2. Explanation with visual analogies:");
    try {
        const visualExplanation = await lm.explainWithVisualAnalogies('cognitive_architecture');
        console.log("  Explanation:", visualExplanation.explanation || "N/A");
        console.log("  Analogies:");
        if (visualExplanation.visualAnalogies) {
            visualExplanation.visualAnalogies.forEach((analogy, index) => {
                console.log(`    ${index + 1}. ${analogy}`);
            });
        }
    } catch (error) {
        console.log("  Error:", error.message);
    }

    // Test interactive explanation
    console.log("\n3. Interactive explanation:");
    try {
        const interactiveExplanation = await lm.explainInteractive('neural_network');
        console.log("  Explanation:", interactiveExplanation.explanation || "N/A");
        console.log("  Anticipated Questions:");
        if (interactiveExplanation.anticipatedQuestions) {
            interactiveExplanation.anticipatedQuestions.forEach((qa, index) => {
                console.log(`    Q${index + 1}. ${qa.question}`);
                console.log(`      A. ${qa.answer}`);
            });
        }
    } catch (error) {
        console.log("  Error:", error.message);
    }

    // Test comparative explanation
    console.log("\n4. Comparative explanation:");
    try {
        const comparisonExplanation = await lm.explainWithComparison('SeNARS', ['neural_network', 'symbolic_reasoning']);
        console.log("  Explanation:", comparisonExplanation.explanation || "N/A");
    } catch (error) {
        console.log("  Error:", error.message);
    }

    // Test comprehensive hypothesis generation
    console.log("\n5. Comprehensive hypothesis generation:");
    try {
        const hypotheses = await lm.generateComprehensiveHypotheses(tasks);
        console.log(`  Generated ${hypotheses.length} hypotheses:`);
        hypotheses.slice(0, 3).forEach((hypothesis, index) => {
            console.log(`    ${index + 1}. ${hypothesis.termKey} (freq: ${hypothesis.state.truthValue.frequency.toFixed(2)}, conf: ${hypothesis.state.truthValue.confidence.toFixed(2)})`);
        });
    } catch (error) {
        console.log("  Error:", error.message);
    }

    console.log("\n=== Demo Complete ===");
}

module.exports = advancedLMDemo;

if (require.main === module) {
    advancedLMDemo().catch(console.error);
}