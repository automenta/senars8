// Category: Language Model
// Description: Shows the integration of Natural Language Processing (NLP) for parsing natural language input into Narsese.

import { runDemo } from '../shared/demo-utils.js';

async function nlpIntegrationDemo() {
    const naturalLanguageInputs = [
        "A bird is an animal.",
        "Is a bird a living thing?",
        "Find out why the sky is blue."
    ];

    const taskDefs = []; // Will be populated by the preCycleCallback

    const preCycleCallback = async (system) => {
        console.log("Processing natural language inputs...");
        for (const nl of naturalLanguageInputs) {
            const tasks = await system.lm.nlp.parse(nl);
            taskDefs.push(...tasks);
        }
        console.log("Converted natural language to tasks:", taskDefs.map(t => t.termKey));
    };

    const postCycleCallback = (system) => {
        console.log("\nVerifying that NLP-derived tasks are in memory...");
        const tasks = system.introspection.queryTasks({});
        const nlpTask = tasks.find(t => t.termKey.includes('bird') && t.termKey.includes('animal'));
        if (nlpTask) {
            console.log("Found task derived from 'A bird is an animal.'");
        } else {
            console.log("Could not verify NLP-derived task.");
        }
    };

    await runDemo('NLP Integration Demo', taskDefs, {
        cycleCount: 2,
        preCycleCallback,
        postCycleCallback
    });
}

export default nlpIntegrationDemo;

if (import.meta.url.startsWith('file:')) {
    nlpIntegrationDemo().catch(console.error);
}