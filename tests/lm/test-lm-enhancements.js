const LM = require('../src/lm/LM');
const Task = require('../src/core/Task');
const {
    parseTerm
} = require('../src/parser/narseseParser');

async function testSection(title, testFn) {
    console.log(`\n${title}`);
    try {
        await testFn();
    } catch (error) {
        console.error('   Error:', error.message);
    }
}

async function testLMEnhancements() {
    console.log('=== Testing Enhanced LM Capabilities ===\n');
    const lm = new LM();
    const taskDefs = [{
        termKey: '(bird --> can_fly)',
        punctuation: '.',
        truthValue: {
            frequency: 0.95,
            confidence: 0.95
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
            frequency: 0.95,
            confidence: 0.95
        }
    },];

    const tasks = taskDefs.map(def => parseTerm(def.termKey) ? new Task(parseTerm(def.termKey), def.punctuation, def.truthValue) : null).filter(Boolean);

    await testSection('1. Testing sophisticated hypothesis generation...', async () => {
        const hypotheses = await lm.generateSophisticatedHypotheses(tasks);
        console.log(`   Generated ${hypotheses.length} sophisticated hypotheses:`);
        hypotheses.forEach((h, i) => console.log(`     ${i + 1}. ${h.termKey}${h.punctuation} (freq: ${h.state.truthValue.frequency.toFixed(3)}, conf: ${h.state.truthValue.confidence.toFixed(3)})`));
    });

    await testSection('2. Testing comprehensive explanation...', async () => {
        const explanation = await lm.explainComprehensive('penguin', 'bird taxonomy');
        console.log("   Comprehensive explanation of 'penguin':");
        console.log('   Perspectives:');
        for (const [p, exp] of Object.entries(explanation.perspectives || {})) {
            console.log(`     ${p.charAt(0).toUpperCase() + p.slice(1)}: ${exp.substring(0, 100)}${exp.length > 100 ? '...' : ''}`);
        }
        if (explanation.synthesis) {
            console.log(`   Synthesis: ${explanation.synthesis.substring(0, 100)}${explanation.synthesis.length > 100 ? '...' : ''}`);
        }
    });

    await testSection('3. Testing audience-specific explanations...', async () => {
        for (const audience of ['beginner', 'intermediate', 'expert']) {
            console.log(`   ${audience.charAt(0).toUpperCase() + audience.slice(1)} explanation of 'inheritance':`);
            const explanation = await lm.explainForAudience('inheritance', audience, 'object-oriented programming');
            console.log(`     ${explanation.substring(0, 120)}${explanation.length > 120 ? '...' : ''}`);
        }
    });

    console.log('\n=== Test Complete ===');
}

testLMEnhancements().catch(console.error);
