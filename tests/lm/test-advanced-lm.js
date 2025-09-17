const LM = require('../src/lm/LM');
const Task = require('../src/core/Task');
const {
    parseTerm
} = require('../src/parser/narseseParser');

function printHypotheses(title, hypotheses) {
    console.log(`\n${title}`);
    console.log(`Generated ${hypotheses.length} hypotheses:`);
    for (const hypothesis of hypotheses) {
        console.log(`  - ${hypothesis.termKey} (freq: ${hypothesis.state.truthValue.frequency.toFixed(2)}, conf: ${hypothesis.state.truthValue.confidence.toFixed(2)})`);
    }
}

async function testAdvancedLMCapabilities() {
    console.log('=== Testing Advanced LM Capabilities ===\n');
    const lm = new LM();
    const taskDefs = [{
        termKey: '(bird --> can_fly)',
        punctuation: '.',
        truthValue: {
            frequency: 0.9,
            confidence: 0.9
        }
    }, {
        termKey: '(penguin --> bird)',
        punctuation: '.',
        truthValue: {
            frequency: 1.0,
            confidence: 0.95
        }
    }, {
        termKey: '(penguin --> (--, can_fly))',
        punctuation: '.',
        truthValue: {
            frequency: 0.9,
            confidence: 0.9
        }
    }, ];

    const tasks = taskDefs.map(def => {
        const parsedTerm = parseTerm(def.termKey);
        return parsedTerm ? new Task(parsedTerm, def.punctuation, def.truthValue) : null;
    }).filter(Boolean);

    printHypotheses('Testing causal hypothesis generation...', await lm.generateCausalHypotheses(tasks));
    printHypotheses('Testing predictive hypothesis generation...', await lm.generatePredictiveHypotheses(tasks));
    printHypotheses('Testing comprehensive hypothesis generation...', await lm.generateComprehensiveHypotheses(tasks));

    console.log('\nTesting counterfactual explanation...');
    const counterfactualExplanation = await lm.explainCounterfactual('bird');
    if (counterfactualExplanation.error) {
        console.log(`Error: ${counterfactualExplanation.error}`);
    } else {
        console.log(`Explanation: ${counterfactualExplanation.explanation}`);
        console.log('Counterfactual Scenarios:');
        for (const scenario of counterfactualExplanation.counterfactualScenarios) {
            console.log(`  - ${scenario.scenario}: ${scenario.description}`);
        }
    }

    console.log('\n=== Test Complete ===');
}

testAdvancedLMCapabilities().catch(console.error);
