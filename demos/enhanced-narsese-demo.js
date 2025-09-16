// Description: Demonstrates parsing and reasoning with a richer, more expressive form of Narsese.
const { runDemo } = require('./demo-utils');

async function enhancedNarseseDemo() {
    const taskDefs = [
        // Temporal operators
        {
            termKey: '(always, (bird --> animal))',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },
        {
            termKey: '(eventually, (sun --> rise))',
            punctuation: '.',
            truthValue: {
                frequency: 0.95,
                confidence: 0.85
            }
        },
        {
            termKey: '(next, (action --> execute))',
            punctuation: '.',
            truthValue: {
                frequency: 0.8,
                confidence: 0.7
            }
        },
        {
            termKey: '(previous, (state --> completed))',
            punctuation: '.',
            truthValue: {
                frequency: 0.9,
                confidence: 0.8
            }
        },

        // Temporal relationships
        {
            termKey: '((task_a --> start) until (task_b --> finish))',
            punctuation: '.',
            truthValue: {
                frequency: 0.85,
                confidence: 0.8
            }
        },
        {
            termKey: '((event_a --> occur) since (event_b --> happen))',
            punctuation: '.',
            truthValue: {
                frequency: 0.75,
                confidence: 0.7
            }
        },

        // Complex conjunctions
        {
            termKey: '(&/, (initialize --> system), (load --> data), (process --> information))',
            punctuation: '.',
            truthValue: {
                frequency: 0.9,
                confidence: 0.85
            }
        },
        {
            termKey: '(&|, (monitor --> cpu), (monitor --> memory), (monitor --> network))',
            punctuation: '.',
            truthValue: {
                frequency: 0.85,
                confidence: 0.8
            }
        },

        // Nested temporal expressions
        {
            termKey: '(always, (eventually, (goal --> achieve)))',
            punctuation: '.',
            truthValue: {
                frequency: 0.9,
                confidence: 0.75
            }
        },
        {
            termKey: '(next, (previous, (state --> previous)))',
            punctuation: '.',
            truthValue: {
                frequency: 0.8,
                confidence: 0.6
            }
        },

        // Questions about temporal relationships
        {
            termKey: '(next, (action --> take))',
            punctuation: '?',
            truthValue: {
                frequency: 1.0,
                confidence: 0.8
            }
        },
        {
            termKey: '((process --> start) until (process --> finish))',
            punctuation: '?',
            truthValue: {
                frequency: 1.0,
                confidence: 0.8
            }
        },

        // Goals with temporal constraints
        {
            termKey: '(eventually, (project --> complete))',
            punctuation: '!',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },
        {
            termKey: '(&/, (acquire --> resources), (next, (begin --> implementation)))',
            punctuation: '!',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        }
    ];

    const postCycleCallback = (system) => {
        console.log("\n=== Sample Parsed Tasks ===");
        const allTasks = system.memory.getAllTasks();

        console.log(`Total tasks in memory: ${allTasks.length}`);

        // Show tasks with temporal constructs
        const temporalTasks = allTasks.filter(task =>
            task.termKey.includes('always') ||
            task.termKey.includes('eventually') ||
            task.termKey.includes('next') ||
            task.termKey.includes('previous') ||
            task.termKey.includes('until') ||
            task.termKey.includes('since') ||
            task.termKey.includes('&/')
        );

        console.log(`Tasks with temporal constructs: ${temporalTasks.length}`);

        // Show some interesting temporal tasks
        const interestingTasks = temporalTasks.slice(0, 5); // Get first 5 temporal tasks
        for (const task of interestingTasks) {
            console.log(`  - ${task.termKey} (freq: ${task.state.truthValue.frequency.toFixed(2)}, conf: ${task.state.truthValue.confidence.toFixed(2)})`);
        }
    };

    await runDemo('Enhanced Narsese Demo', taskDefs, {
        cycleCount: 3,
        postCycleCallback
    });
}

module.exports = enhancedNarseseDemo;

if (require.main === module) {
    enhancedNarseseDemo().catch(console.error);
}