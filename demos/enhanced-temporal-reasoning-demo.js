// Description: Demonstrates advanced temporal reasoning, like inferring sequences and predicting events.
const { runDemo } = require('./demo-utils');

async function enhancedTemporalReasoningDemo() {
    // Current time reference
    const now = Date.now();

    const taskDefs = [
        // Morning routine tasks
        {
            termKey: '(wake_up)',
            punctuation: '.',
            truthValue: {
                frequency: 0.95,
                confidence: 0.9
            },
            stamp: {
                creationTime: now,
                occurrenceTime: now - 8 * 60 * 60 * 1000
            }
        },
        {
            termKey: '(brush_teeth)',
            punctuation: '.',
            truthValue: {
                frequency: 0.95,
                confidence: 0.9
            },
            stamp: {
                creationTime: now,
                occurrenceTime: now - 7.5 * 60 * 60 * 1000
            }
        },
        {
            termKey: '(eat_breakfast)',
            punctuation: '.',
            truthValue: {
                frequency: 0.9,
                confidence: 0.9
            },
            stamp: {
                creationTime: now,
                occurrenceTime: now - 7 * 60 * 60 * 1000
            }
        },

        // Work tasks
        {
            termKey: '(start_work)',
            punctuation: '.',
            truthValue: {
                frequency: 0.9,
                confidence: 0.8
            },
            stamp: {
                creationTime: now,
                occurrenceTime: now - 6 * 60 * 60 * 1000
            }
        },
        {
            termKey: '(meeting)',
            punctuation: '.',
            truthValue: {
                frequency: 0.8,
                confidence: 0.8
            },
            stamp: {
                creationTime: now,
                occurrenceTime: now - 5 * 60 * 60 * 1000
            }
        },
        {
            termKey: '(coding)',
            punctuation: '.',
            truthValue: {
                frequency: 0.95,
                confidence: 0.9
            },
            stamp: {
                creationTime: now,
                occurrenceTime: now - 4.5 * 60 * 60 * 1000,
                endTime: now - 3 * 60 * 60 * 1000
            }
        },
        {
            termKey: '(lunch)',
            punctuation: '.',
            truthValue: {
                frequency: 0.9,
                confidence: 0.9
            },
            stamp: {
                creationTime: now,
                occurrenceTime: now - 2.5 * 60 * 60 * 1000
            }
        },

        // Afternoon tasks
        {
            termKey: '(continue_work)',
            punctuation: '.',
            truthValue: {
                frequency: 0.9,
                confidence: 0.8
            },
            stamp: {
                creationTime: now,
                occurrenceTime: now - 2 * 60 * 60 * 1000
            }
        },
        {
            termKey: '(coffee_break)',
            punctuation: '.',
            truthValue: {
                frequency: 0.85,
                confidence: 0.8
            },
            stamp: {
                creationTime: now,
                occurrenceTime: now - 1.5 * 60 * 60 * 1000
            }
        },

        // Evening tasks (future predictions)
        {
            termKey: '(end_work)',
            punctuation: '?',
            truthValue: {
                frequency: 0.8,
                confidence: 0.7
            },
            stamp: {
                creationTime: now,
                occurrenceTime: now + 0.5 * 60 * 60 * 1000
            }
        },
        {
            termKey: '(dinner)',
            punctuation: '?',
            truthValue: {
                frequency: 0.9,
                confidence: 0.8
            },
            stamp: {
                creationTime: now,
                occurrenceTime: now + 1.5 * 60 * 60 * 1000
            }
        },
        {
            termKey: '(relax)',
            punctuation: '?',
            truthValue: {
                frequency: 0.85,
                confidence: 0.7
            },
            stamp: {
                creationTime: now,
                occurrenceTime: now + 2.5 * 60 * 60 * 1000
            }
        },

        // Goal to analyze temporal patterns
        {
            termKey: '(analyze_daily_routine)',
            punctuation: '!',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        }
    ];

    await runDemo('Enhanced Temporal Reasoning Demo', taskDefs, {
        cycleCount: 5
    });
}

module.exports = enhancedTemporalReasoningDemo;

if (require.main === module) {
    enhancedTemporalReasoningDemo().catch(console.error);
}