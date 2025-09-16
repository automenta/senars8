// Description: Demonstrates the system's ability to perform mathematical inference.
const { runDemo } = require('./demo-utils');

async function mathInferenceDemo() {
    const taskDefs = [
        // Axiom: All numbers are either even or odd
        {
            termKey: '(number --> (||, even, odd))',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },
        // Fact: 2 is a number
        {
            termKey: '(2 --> number)',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.95
            }
        },
        // Fact: 2 is even
        {
            termKey: '(2 --> even)',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.95
            }
        },
        // Rule: Even numbers are divisible by 2
        {
            termKey: '((number --> even) ==> (number --> divisible_by_2))',
            punctuation: '.',
            truthValue: {
                frequency: 0.9,
                confidence: 0.9
            }
        },
        // Goal: Understand properties of 2
        {
            termKey: '(2 --> divisible_by_2)',
            punctuation: '?',
            truthValue: {
                frequency: 1.0,
                confidence: 0.8
            }
        }
    ];

    await runDemo('Math Inference Demo', taskDefs, {
        cycleCount: 3
    });
}

module.exports = mathInferenceDemo;

if (require.main === module) {
    mathInferenceDemo().catch(console.error);
}