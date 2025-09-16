// Description: A basic demonstration of the system's reasoning capabilities.
import {runDemo} from '../shared/demo-utils.js';

async function runBasicDemo() {
    const taskDefs = [
        {termKey: 'bird', punctuation: '.', truthValue: {frequency: 0.9, confidence: 0.8}},
        {termKey: 'flies', punctuation: '.', truthValue: {frequency: 0.8, confidence: 0.7}},
        {termKey: '(bird --> flies)', punctuation: '.', truthValue: {frequency: 0.9, confidence: 0.8}},
        {termKey: '(bird --> animal)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.9}},
        {termKey: '(animal --> living)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.95}},
        {termKey: '((&,bird,living) --> animal)', punctuation: '!', truthValue: {frequency: 0.9, confidence: 0.8}}
    ];

    await runDemo('Basic Demo', taskDefs, 5);
}

runBasicDemo().catch(console.error);

export {runBasicDemo};