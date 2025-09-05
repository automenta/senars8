const LM = require('./src/lm/LM');
const Task = require('./src/core/Task');
const { parseTerm } = require('./src/parser/NewParser');

async function testLMEnhancements() {
    console.log("=== Testing Enhanced LM Capabilities ===\n");
    
    const lm = new LM();
    
    // Create some sample tasks
    const taskDefs = [
        { termKey: '(bird --> can_fly)', punctuation: '.', truthValue: { frequency: 0.95, confidence: 0.95 } },
        { termKey: '(penguin --> bird)', punctuation: '.', truthValue: { frequency: 1.0, confidence: 0.95 } },
        { termKey: '(penguin --> (--, can_fly))', punctuation: '.', truthValue: { frequency: 0.95, confidence: 0.95 } }
    ];
    
    const tasks = taskDefs.map(def => {
        const parsedTerm = parseTerm(def.termKey);
        if (parsedTerm) {
            return new Task(parsedTerm, def.punctuation, def.truthValue);
        }
        return null;
    }).filter(Boolean);
    
    console.log("1. Testing sophisticated hypothesis generation...");
    try {
        const sophisticatedHypotheses = await lm.generateSophisticatedHypotheses(tasks);
        console.log(`   Generated ${sophisticatedHypotheses.length} sophisticated hypotheses:`);
        for (let i = 0; i < sophisticatedHypotheses.length; i++) {
            const hypothesis = sophisticatedHypotheses[i];
            console.log(`     ${i + 1}. ${hypothesis.termKey}${hypothesis.punctuation} (freq: ${hypothesis.state.truthValue.frequency.toFixed(3)}, conf: ${hypothesis.state.truthValue.confidence.toFixed(3)})`);
        }
    } catch (error) {
        console.error("   Error:", error.message);
    }
    
    console.log("\n2. Testing comprehensive explanation...");
    try {
        const comprehensiveExplanation = await lm.explainComprehensive("penguin", "bird taxonomy");
        console.log("   Comprehensive explanation of 'penguin':");
        console.log("   Perspectives:");
        for (const [perspective, explanation] of Object.entries(comprehensiveExplanation.perspectives || {})) {
            console.log(`     ${perspective.charAt(0).toUpperCase() + perspective.slice(1)}: ${explanation.substring(0, 100)}${explanation.length > 100 ? '...' : ''}`);
        }
        if (comprehensiveExplanation.synthesis) {
            console.log(`   Synthesis: ${comprehensiveExplanation.synthesis.substring(0, 100)}${comprehensiveExplanation.synthesis.length > 100 ? '...' : ''}`);
        }
    } catch (error) {
        console.error("   Error:", error.message);
    }
    
    console.log("\n3. Testing audience-specific explanations...");
    const audiences = ['beginner', 'intermediate', 'expert'];
    for (const audience of audiences) {
        try {
            console.log(`   ${audience.charAt(0).toUpperCase() + audience.slice(1)} explanation of 'inheritance':`);
            const explanation = await lm.explainForAudience("inheritance", audience, "object-oriented programming");
            console.log(`     ${explanation.substring(0, 120)}${explanation.length > 120 ? '...' : ''}`);
        } catch (error) {
            console.error("   Error:", error.message);
        }
    }
    
    console.log("\n=== Test Complete ===");
}

testLMEnhancements().catch(console.error);