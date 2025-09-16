// Description: Showcases the generation of creative and sophisticated hypotheses using the LM module.
const {
    createTask,
    runDemo
} = require('../shared/demo-utils.js');

async function advancedHypothesisGenerationDemo() {
    const observations = [{
        termKey: '(cat --> chase_mouse).',
        punctuation: '.',
        truthValue: {
            frequency: 0.9,
            confidence: 0.9
        }
    }, {
        termKey: '(dog --> chase_cat).',
        punctuation: '.',
        truthValue: {
            frequency: 0.8,
            confidence: 0.8
        }
    }, {
        termKey: '(hawk --> chase_mouse).',
        punctuation: '.',
        truthValue: {
            frequency: 0.7,
            confidence: 0.7
        }
    }, ];

    const postCycleCallback = async (system, tasks) => {
        console.log("\n2. Asking the LM to generate creative hypotheses...\n");

        const creativeHypotheses = await system.lm.generateHypotheses(tasks, {
            type: 'creative',
            num: 2,
        });

        console.log("Creative hypotheses generated:");
        if (creativeHypotheses.length > 0) {
            creativeHypotheses.forEach((task, i) => {
                console.log(`  - Hypothesis ${i + 1}: ${task.termKey}${task.punctuation}`);
                console.log(`    Truth Value: { freq: ${task.state.truthValue.frequency.toFixed(2)}, conf: ${task.state.truthValue.confidence.toFixed(2)} }`);
            });
        } else {
            console.log("  No creative hypotheses were generated.");
        }

        console.log("\n3. Asking the LM to generate and refine sophisticated hypotheses...\n");

        const sophisticatedHypotheses = await system.lm.generateHypotheses(tasks, {
            type: 'sophisticated',
            num: 1,
            refinement: 'make_testable'
        });

        console.log("Refined, sophisticated hypotheses generated:");
        if (sophisticatedHypotheses.length > 0) {
            sophisticatedHypotheses.forEach((task, i) => {
                console.log(`  - Hypothesis ${i + 1}: ${task.termKey}${task.punctuation}`);
                console.log(`    Truth Value: { freq: ${task.state.truthValue.frequency.toFixed(2)}, conf: ${task.state.truthValue.confidence.toFixed(2)} }`);
            });
        } else {
            console.log("  No sophisticated hypotheses were generated.");
        }
    };

    await runDemo('Advanced Hypothesis Generation Demo', observations, {
        cycleCount: 0,
        postCycleCallback
    });
}

module.exports = advancedHypothesisGenerationDemo;

if (require.main === module) {
    advancedHypothesisGenerationDemo().catch(console.error);
}
