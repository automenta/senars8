// Description: Demonstrates the use of extended and custom inference rules.
const { runDemo } = require('./demo-utils');

async function extendedInferenceRulesDemo() {
    const taskDefs = [
        // Basic inheritance relationships
        {
            termKey: '(bird --> animal)',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },
        {
            termKey: '(animal --> living_thing)',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.95
            }
        },
        {
            termKey: '(robin --> bird)',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },
        {
            termKey: '(penguin --> bird)',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },
        {
            termKey: '(penguin --> swimmer)',
            punctuation: '.',
            truthValue: {
                frequency: 0.9,
                confidence: 0.85
            }
        },
        {
            termKey: '(fish --> swimmer)',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },
        {
            termKey: '(mammal --> animal)',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.95
            }
        },
        {
            termKey: '(dog --> mammal)',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },

        // Questions to trigger inference
        {
            termKey: '(robin --> living_thing)',
            punctuation: '?',
            truthValue: {
                frequency: 1.0,
                confidence: 0.8
            }
        },
        {
            termKey: '(dog --> living_thing)',
            punctuation: '?',
            truthValue: {
                frequency: 1.0,
                confidence: 0.8
            }
        },
        {
            termKey: '(penguin --> animal)',
            punctuation: '?',
            truthValue: {
                frequency: 1.0,
                confidence: 0.8
            }
        },
        {
            termKey: '(&, bird, swimmer)',
            punctuation: '?',
            truthValue: {
                frequency: 1.0,
                confidence: 0.8
            }
        },
        {
            termKey: '(swimmer --> animal)',
            punctuation: '?',
            truthValue: {
                frequency: 1.0,
                confidence: 0.8
            }
        },
        {
            termKey: '((--,animal) --> (--,bird))',
            punctuation: '?',
            truthValue: {
                frequency: 1.0,
                confidence: 0.8
            }
        },

        // Goals to trigger inference
        {
            termKey: 'derive_all_relationships',
            punctuation: '!',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        }
    ];

    const postCycleCallback = (system) => {
        console.log("\n=== Sample Derived Tasks ===");
        const allTasks = system.memory.getAllTasks();
        const derivedTasks = allTasks.filter(task => task.punctuation === '.');

        console.log(`Total tasks in memory: ${allTasks.length}`);
        console.log(`Derived belief tasks: ${derivedTasks.length}`);

        // Show some interesting derived tasks
        const interestingTasks = derivedTasks.slice(-5); // Get last 5 tasks
        for (const task of interestingTasks) {
            console.log(`  - ${task.termKey} (freq: ${task.state.truthValue.frequency.toFixed(2)}, conf: ${task.state.truthValue.confidence.toFixed(2)})`);
        }
    };

    await runDemo('Extended Inference Rules Demo', taskDefs, {
        cycleCount: 5,
        postCycleCallback
    });
}

module.exports = extendedInferenceRulesDemo;

if (require.main === module) {
    extendedInferenceRulesDemo().catch(console.error);
}