// Description: Demonstrates detecting and resolving contradictions.
const { runDemo } = require('./demo-utils');

async function contradictionResolutionDemo() {
    const taskDefs = [
        // High confidence belief that birds can fly
        {
            termKey: '(bird --> can_fly)',
            punctuation: '.',
            truthValue: {
                frequency: 0.95,
                confidence: 0.95
            }
        },
        // High confidence belief that penguins are birds
        {
            termKey: '(penguin --> bird)',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.95
            }
        },
        // High confidence belief that penguins cannot fly
        {
            termKey: '(penguin --> (--, can_fly))',
            punctuation: '.',
            truthValue: {
                frequency: 0.95,
                confidence: 0.95
            }
        },
        // Question about penguins flying
        {
            termKey: '(penguin --> can_fly)',
            punctuation: '?',
            truthValue: {
                frequency: 1.0,
                confidence: 0.8
            }
        },
        // Goal to resolve contradiction
        {
            termKey: 'resolve_bird_flying_contradiction',
            punctuation: '!',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        }
    ];

    await runDemo('Contradiction Resolution Demo', taskDefs, {
        cycleCount: 6
    });
}

module.exports = contradictionResolutionDemo;

if (require.main === module) {
    contradictionResolutionDemo().catch(console.error);
}