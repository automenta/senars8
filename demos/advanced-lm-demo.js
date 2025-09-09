const { runDemo, createTask } = require('../shared/demo-utils');
const LM = require('../src/lm/LM');

async function advancedLMDemo() {
    const taskDefs = [
        {termKey: '(AI --> intelligent_system)', punctuation: '.', truthValue: {frequency: 0.95, confidence: 0.9}},
        {termKey: '(neural_network --> machine_learning_model)', punctuation: '.', truthValue: {frequency: 0.9, confidence: 0.85}},
        {termKey: '(symbolic_reasoning --> logical_inference)', punctuation: '.', truthValue: {frequency: 0.85, confidence: 0.8}},
        {termKey: '(AI --> (&, neural_network, symbolic_reasoning))', punctuation: '.', truthValue: {frequency: 0.8, confidence: 0.75}},
        {termKey: '(cognitive_architecture --> AI)', punctuation: '.', truthValue: {frequency: 0.75, confidence: 0.7}},
        {termKey: '(SeNARS --> cognitive_architecture)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.95}},
        {termKey: '(explain_seNARS)', punctuation: '!', truthValue: {frequency: 1.0, confidence: 0.9}}
    ];

    await runDemo('Advanced LM Demo', taskDefs, 3);
}

module.exports = advancedLMDemo;

if (require.main === module) {
    advancedLMDemo().catch(console.error);
}