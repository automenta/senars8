// Description: Demonstrates multiple capabilities of the SeNARS system in a single run.
const { runDemo } = require('../shared/demo-utils.js');

async function comprehensiveSystemDemo() {
    const taskDefs = [
        // Knowledge about animals
        {
            termKey: '(animal --> (||, mammal, bird, fish))',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },
        {
            termKey: '(mammal --> warm_blooded)',
            punctuation: '.',
            truthValue: {
                frequency: 0.95,
                confidence: 0.9
            }
        },
        {
            termKey: '(bird --> warm_blooded)',
            punctuation: '.',
            truthValue: {
                frequency: 0.95,
                confidence: 0.9
            }
        },
        {
            termKey: '(fish --> cold_blooded)',
            punctuation: '.',
            truthValue: {
                frequency: 0.9,
                confidence: 0.9
            }
        },
        {
            termKey: '(dog --> mammal)',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.95
            }
        },
        {
            termKey: '(sparrow --> bird)',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.95
            }
        },
        {
            termKey: '(goldfish --> fish)',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.95
            }
        },

        // Temporal knowledge
        {
            termKey: 'daytime',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            },
            stamp: {
                creationTime: Date.now(),
                occurrenceTime: Date.now()
            }
        },
        {
            termKey: '(daytime ==> birds_sing)',
            punctuation: '.',
            truthValue: {
                frequency: 0.8,
                confidence: 0.8
            }
        },

        // Goals
        {
            termKey: 'understand_animal_classification',
            punctuation: '!',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },
        {
            termKey: 'predict_animal_behavior',
            punctuation: '!',
            truthValue: {
                frequency: 1.0,
                confidence: 0.8
            }
        }
    ];

    await runDemo('Comprehensive System Demo', taskDefs, {
        cycleCount: 7
    });
}

module.exports = comprehensiveSystemDemo;

if (require.main === module) {
    comprehensiveSystemDemo().catch(console.error);
}