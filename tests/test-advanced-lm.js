const LM = require('../src/lm/LM');
const Task = require('../src/core/Task');
const {parseTerm} = require('../src/parser/NewParser');

async function testAdvancedLMCapabilities() {
    console.log("=== Testing Advanced LM Capabilities ===\n");

    const lm = new LM();

    // Create some test tasks
    const taskDefs = [
        {termKey: '(bird --> can_fly)', punctuation: '.', truthValue: {frequency: 0.9, confidence: 0.9}},
        {termKey: '(penguin --> bird)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.95}},
        {termKey: '(penguin --> (--, can_fly))', punctuation: '.', truthValue: {frequency: 0.9, confidence: 0.9}}
    ];

    const tasks = [];
    for (const def of taskDefs) {
        const parsedTerm = parseTerm(def.termKey);
        if (parsedTerm) {
            const task = new Task(parsedTerm, def.punctuation, def.truthValue);
            tasks.push(task);
        }
    }

    console.log("Testing causal hypothesis generation...");
    const causalHypotheses = await lm.generateCausalHypotheses(tasks);
    console.log(`Generated ${causalHypotheses.length} causal hypotheses:`);
    for (const hypothesis of causalHypotheses) {
        console.log(`  - ${hypothesis.termKey} (freq: ${hypothesis.state.truthValue.frequency}, conf: ${hypothesis.state.truthValue.confidence})`);
    }

    console.log("\nTesting predictive hypothesis generation...");
    const predictiveHypotheses = await lm.generatePredictiveHypotheses(tasks);
    console.log(`Generated ${predictiveHypotheses.length} predictive hypotheses:`);
    for (const hypothesis of predictiveHypotheses) {
        console.log(`  - ${hypothesis.termKey} (freq: ${hypothesis.state.truthValue.frequency}, conf: ${hypothesis.state.truthValue.confidence})`);
    }

    console.log("\nTesting comprehensive hypothesis generation...");
    const comprehensiveHypotheses = await lm.generateComprehensiveHypotheses(tasks);
    console.log(`Generated ${comprehensiveHypotheses.length} comprehensive hypotheses:`);
    for (const hypothesis of comprehensiveHypotheses) {
        console.log(`  - ${hypothesis.termKey} (freq: ${hypothesis.state.truthValue.frequency}, conf: ${hypothesis.state.truthValue.confidence})`);
    }

    console.log("\nTesting counterfactual explanation...");
    const counterfactualExplanation = await lm.explainCounterfactual('bird');
    if (counterfactualExplanation.error) {
        console.log(`Error: ${counterfactualExplanation.error}`);
    } else {
        console.log(`Explanation: ${counterfactualExplanation.explanation}`);
        console.log("Counterfactual Scenarios:");
        for (const scenario of counterfactualExplanation.counterfactualScenarios) {
            console.log(`  - ${scenario.scenario}: ${scenario.description}`);
        }
    }

    console.log("\n=== Test Complete ===");
}

testAdvancedLMCapabilities().catch(console.error);