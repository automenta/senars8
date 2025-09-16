// Description: A demo for debugging contradiction detection and resolution.
const { runDemo, createTask } = require('../shared/demo-utils.js');
const MetaCognition = require('../src/system/MetaCognition');

async function debugContradictionsDemo() {
    const taskDefs = [
        {
            termKey: '(bird --> can_fly)',
            punctuation: '.',
            truthValue: {
                frequency: 0.95,
                confidence: 0.95
            }
        },
        {
            termKey: '(penguin --> bird)',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.95
            }
        },
        {
            termKey: '(penguin --> (--, can_fly))',
            punctuation: '.',
            truthValue: {
                frequency: 0.95,
                confidence: 0.95
            }
        }
    ];

    const postCycleCallback = (system, tasks) => {
        const metaCognition = new MetaCognition();

        console.log("Finding contradictions...\n");
        const contradictions = metaCognition.findContradictions(tasks);

        console.log(`Found ${contradictions.length} contradictions:`);
        for (let i = 0; i < contradictions.length; i++) {
            const contradiction = contradictions[i];
            console.log(`${i + 1}. Type: ${contradiction.type}`);
            console.log(`   Confidence: ${contradiction.confidence.toFixed(3)}`);
            console.log(`   Severity: ${(contradiction.severity || 0).toFixed(3)}`);
            console.log(`   Details: ${contradiction.details}`);
            console.log(`   Tasks:`);
            for (const task of contradiction.tasks) {
                console.log(`     - ${task.termKey}${task.punctuation} (freq: ${task.state.truthValue.frequency.toFixed(3)}, conf: ${task.state.truthValue.confidence.toFixed(3)})`);
            }
            console.log();
        }

        if (contradictions.length > 0) {
            console.log("Resolving contradictions...\n");
            for (const contradiction of contradictions) {
                const resolutionTasks = metaCognition.resolve(contradiction, 'revision');
                console.log(`Resolution for ${contradiction.type}:`);
                console.log(`  Generated ${resolutionTasks.length} meta-tasks:`);
                for (const task of resolutionTasks) {
                    console.log(`    - ${task.termKey}${task.punctuation} (freq: ${task.state.truthValue.frequency.toFixed(3)}, conf: ${task.state.truthValue.confidence.toFixed(3)})`);
                }
                console.log();
            }
        }
    };

    await runDemo('Debug Contradictions Demo', taskDefs, {
        cycleCount: 0,
        postCycleCallback
    });
}

module.exports = debugContradictionsDemo;

if (require.main === module) {
    debugContradictionsDemo().catch(console.error);
}