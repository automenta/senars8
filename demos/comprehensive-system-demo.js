const System = require('../src/system/System');
const Task = require('../src/core/Task');
const { parseTerm } = require('../src/parser/NewParser');

/**
 * Comprehensive System Demo
 * Demonstrates multiple capabilities of the SeNARS system in a single run.
 */
async function comprehensiveSystemDemo() {
    console.log("=== Comprehensive System Demo ===\n");

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

    // Add initial knowledge to the system
    const taskDefs = [
        // Knowledge about animals
        { termKey: '(animal --> (||, mammal, bird, fish))', punctuation: '.', truthValue: { frequency: 1.0, confidence: 0.9 } },
        { termKey: '(mammal --> warm_blooded)', punctuation: '.', truthValue: { frequency: 0.95, confidence: 0.9 } },
        { termKey: '(bird --> warm_blooded)', punctuation: '.', truthValue: { frequency: 0.95, confidence: 0.9 } },
        { termKey: '(fish --> cold_blooded)', punctuation: '.', truthValue: { frequency: 0.9, confidence: 0.9 } },
        { termKey: '(dog --> mammal)', punctuation: '.', truthValue: { frequency: 1.0, confidence: 0.95 } },
        { termKey: '(sparrow --> bird)', punctuation: '.', truthValue: { frequency: 1.0, confidence: 0.95 } },
        { termKey: '(goldfish --> fish)', punctuation: '.', truthValue: { frequency: 1.0, confidence: 0.95 } },
        
        // Temporal knowledge
        { termKey: 'daytime', punctuation: '.', truthValue: { frequency: 1.0, confidence: 0.9 }, stamp: { creationTime: Date.now(), occurrenceTime: Date.now() } },
        { termKey: '(daytime ==> birds_sing)', punctuation: '.', truthValue: { frequency: 0.8, confidence: 0.8 } },
        
        // Goals
        { termKey: 'understand_animal_classification', punctuation: '!', truthValue: { frequency: 1.0, confidence: 0.9 } },
        { termKey: 'predict_animal_behavior', punctuation: '!', truthValue: { frequency: 1.0, confidence: 0.8 } }
    ];

    // Create tasks and filter out any that failed to parse
    const tasks = taskDefs.map(def => createTask(def.termKey, def.punctuation, def.truthValue, def.stamp)).filter(Boolean);
    
    if (tasks.length === 0) {
        console.log("No valid tasks could be created. Exiting demo.");
        return;
    }

    await system.addTasks(tasks);

    console.log("Running 7 cognitive cycles to demonstrate comprehensive system capabilities...\n");
    
    for (let i = 0; i < 7; i++) {
        const result = await system.runCycle();
        console.log(`Cycle ${i+1}:`);
        console.log(`  - Derived Tasks: ${result.derivedTasks}`);
        console.log(`  - Contradictions: ${result.contradictions}`);
        console.log(`  - Meta Tasks: ${result.metaTasks}`);
        console.log(`  - Execution Results: ${JSON.stringify(result.executionResults)}`);
        console.log();
    }

    console.log("\n=== Demo Complete ===");
}

module.exports = comprehensiveSystemDemo;

if (require.main === module) {
    comprehensiveSystemDemo().catch(console.error);
}