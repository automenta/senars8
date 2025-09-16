import {runDemo} from '../shared/demo-utils.js';

// Description: A demonstration of the system's planning capabilities.
async function planningDemo() {
    const taskDefs = [{
        termKey: '((&&, make_coffee, water) ==> coffee_made)',
        punctuation: '.',
        truthValue: {
            frequency: 0.9,
            confidence: 0.9
        }
    }, {
        termKey: '((&&, make_coffee, coffee_beans) ==> coffee_made)',
        punctuation: '.',
        truthValue: {
            frequency: 0.9,
            confidence: 0.9
        }
    }, {
        termKey: '(tap --> water_source)',
        punctuation: '.',
        truthValue: {
            frequency: 1.0,
            confidence: 0.95
        }
    }, {
        termKey: '(buy --> obtain_coffee_beans)',
        punctuation: '.',
        truthValue: {
            frequency: 0.8,
            confidence: 0.9
        }
    }, {
        termKey: 'make_coffee',
        punctuation: '!',
        truthValue: {
            frequency: 1.0,
            confidence: 0.9
        }
    }, {
        termKey: 'obtain_water',
        punctuation: '!',
        truthValue: {
            frequency: 1.0,
            confidence: 0.8
        }
    }, ];

    await runDemo('Planning Demo (HTN)', taskDefs, {
        cycleCount: 5
    });

    const aStarConfig = {
        planner: {
            strategy: 'AStar'
        }
    };
    await runDemo('Planning Demo (AStar)', taskDefs, {
        cycleCount: 5,
        config: aStarConfig
    });
}

planningDemo().catch(console.error);

export {
    planningDemo
};