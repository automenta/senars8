const System = require('../src/system/System');
const Task = require('../src/core/Task');
const { parseTerm } = require('../src/parser/NewParser');

/**
 * NLP Integration Demo
 * Demonstrates the system's natural language processing capabilities.
 */
async function nlpIntegrationDemo() {
    console.log("=== NLP Integration Demo ===\n");

    const system = new System();
    await system.initialize();

    // Helper function to create a task with error handling
    function createTask(termKey, punctuation, truthValue, stamp = { creationTime: Date.now() }) {
        const parsedTerm = parseTerm(termKey);
        if (!parsedTerm) {
            console.warn(`Failed to parse term: ${termKey}`);
            return null;
        }
        return new Task(parsedTerm, punctuation, truthValue, stamp);
    }

    // Add natural language tasks
    const taskDefs = [
        // Fact expressed in natural language
        { termKey: '(sky_is_blue --> observation)', punctuation: '.', truthValue: { frequency: 1.0, confidence: 0.9 } },
        // Question expressed in natural language
        { termKey: '(why_sky_blue --> question)', punctuation: '?', truthValue: { frequency: 1.0, confidence: 0.9 } },
        // Goal expressed in natural language
        { termKey: '(explain_light_scattering --> goal)', punctuation: '!', truthValue: { frequency: 1.0, confidence: 0.8 } },
        // Complex statement
        { termKey: '((it_rains --> ground_gets_wet) --> conditional_knowledge)', punctuation: '.', truthValue: { frequency: 0.9, confidence: 0.8 } },
        { termKey: '(it_is_raining --> current_condition)', punctuation: '.', truthValue: { frequency: 1.0, confidence: 0.9 } }
    ];

    // Create tasks and filter out any that failed to parse
    const tasks = taskDefs.map(def => createTask(def.termKey, def.punctuation, def.truthValue, def.stamp)).filter(Boolean);
    
    if (tasks.length === 0) {
        console.log("No valid tasks could be created. Exiting demo.");
        return;
    }

    await system.addTasks(tasks);

    console.log("Running 5 cognitive cycles to demonstrate NLP capabilities...\n");
    
    for (let i = 0; i < 5; i++) {
        const result = await system.runCycle();
        console.log(`Cycle ${i+1}:`);
        console.log(`  - Derived Tasks: ${result.derivedTasks}`);
        console.log(`  - Contradictions: ${result.contradictions}`);
        console.log(`  - Meta Tasks: ${result.metaTasks}`);
        console.log();
    }

    console.log("\n=== Demo Complete ===");
}

module.exports = nlpIntegrationDemo;

if (require.main === module) {
    nlpIntegrationDemo().catch(console.error);
}