// Category: Language Model
// Description: Showcases the generation of creative and sophisticated hypotheses from observations using the Language Model.

import { runDemo } from '../shared/demo-utils.js';

async function advancedHypothesisGenerationDemo() {
    const observations = [
        { sentence: '(cat --> chase_mouse).', truth: [0.9, 0.9] },
        { sentence: '(dog --> chase_cat).', truth: [0.8, 0.8] },
        { sentence: '(hawk --> chase_mouse).', truth: [0.7, 0.7] },
    ];

    const postCycleCallback = async (system, tasks) => {
        console.log("\nAsking the LM to generate creative hypotheses...");
        const creativeHypotheses = await system.lm.generateHypotheses(tasks, { type: 'creative', num: 2 });
        console.log("Creative hypotheses:", creativeHypotheses.map(t => t.termKey));

        console.log("\nAsking the LM to generate and refine sophisticated hypotheses...");
        const sophisticatedHypotheses = await system.lm.generateHypotheses(tasks, { type: 'sophisticated', num: 1, refinement: 'make_testable' });
        console.log("Refined, sophisticated hypotheses:", sophisticatedHypotheses.map(t => t.termKey));
    };

    await runDemo('Advanced Hypothesis Generation Demo', observations, { cycleCount: 0, postCycleCallback });
}

export default advancedHypothesisGenerationDemo;

if (import.meta.url.startsWith('file:')) {
    advancedHypothesisGenerationDemo().catch(console.error);
}
