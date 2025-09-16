// Description: Shows how to use the SeNARS system as a library in a Node.js application.
import { runDemo } from '../shared/demo-utils.js';

async function libraryUsageDemo() {
    const taskDefs = [{
        termKey: '<cat --> animal>',
        punctuation: '.',
        truthValue: {
            frequency: 1.0,
            confidence: 0.9
        }
    }];

    await runDemo('Library Usage Demo', taskDefs, {
        cycleCount: 10
    });
}

libraryUsageDemo().catch(console.error);

export {
    libraryUsageDemo
};
