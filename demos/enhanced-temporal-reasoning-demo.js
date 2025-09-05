const System = require('../src/system/System');
const Task = require('../src/core/Task');
const { parseTerm } = require('../src/parser/NewParser');

/**
 * Enhanced Temporal Reasoning Demo
 * Demonstrates the system's enhanced temporal reasoning capabilities.
 */
async function enhancedTemporalReasoningDemo() {
    console.log("=== Enhanced Temporal Reasoning Demo ===\n");

    const system = new System();
    await system.initialize();

    // Helper function to create a temporal task
    function createTemporalTask(termKey, punctuation, truthValue, occurrenceTime, endTime = null) {
        const stamp = {
            creationTime: Date.now(),
            occurrenceTime: occurrenceTime,
            endTime: endTime
        };
        const parsedTerm = parseTerm(termKey);
        if (!parsedTerm) {
            console.warn(`Failed to parse term: ${termKey}`);
            return null;
        }
        return new Task(parsedTerm, punctuation, truthValue, stamp);
    }

    // Current time reference
    const now = Date.now();
    
    // Add temporal knowledge about daily activities
    const taskDefs = [
        // Morning routine tasks
        { termKey: '(wake_up)', punctuation: '.', truthValue: { frequency: 0.95, confidence: 0.9 }, occurrenceTime: now - 8 * 60 * 60 * 1000 },
        { termKey: '(brush_teeth)', punctuation: '.', truthValue: { frequency: 0.95, confidence: 0.9 }, occurrenceTime: now - 7.5 * 60 * 60 * 1000 },
        { termKey: '(eat_breakfast)', punctuation: '.', truthValue: { frequency: 0.9, confidence: 0.9 }, occurrenceTime: now - 7 * 60 * 60 * 1000 },
        
        // Work tasks
        { termKey: '(start_work)', punctuation: '.', truthValue: { frequency: 0.9, confidence: 0.8 }, occurrenceTime: now - 6 * 60 * 60 * 1000 },
        { termKey: '(meeting)', punctuation: '.', truthValue: { frequency: 0.8, confidence: 0.8 }, occurrenceTime: now - 5 * 60 * 60 * 1000 },
        { termKey: '(coding)', punctuation: '.', truthValue: { frequency: 0.95, confidence: 0.9 }, occurrenceTime: now - 4.5 * 60 * 60 * 1000, endTime: now - 3 * 60 * 60 * 1000 },
        { termKey: '(lunch)', punctuation: '.', truthValue: { frequency: 0.9, confidence: 0.9 }, occurrenceTime: now - 2.5 * 60 * 60 * 1000 },
        
        // Afternoon tasks
        { termKey: '(continue_work)', punctuation: '.', truthValue: { frequency: 0.9, confidence: 0.8 }, occurrenceTime: now - 2 * 60 * 60 * 1000 },
        { termKey: '(coffee_break)', punctuation: '.', truthValue: { frequency: 0.85, confidence: 0.8 }, occurrenceTime: now - 1.5 * 60 * 60 * 1000 },
        
        // Evening tasks (future predictions)
        { termKey: '(end_work)', punctuation: '?', truthValue: { frequency: 0.8, confidence: 0.7 }, occurrenceTime: now + 0.5 * 60 * 60 * 1000 },
        { termKey: '(dinner)', punctuation: '?', truthValue: { frequency: 0.9, confidence: 0.8 }, occurrenceTime: now + 1.5 * 60 * 60 * 1000 },
        { termKey: '(relax)', punctuation: '?', truthValue: { frequency: 0.85, confidence: 0.7 }, occurrenceTime: now + 2.5 * 60 * 60 * 1000 },
        
        // Goal to analyze temporal patterns
        { termKey: '(analyze_daily_routine)', punctuation: '!', truthValue: { frequency: 1.0, confidence: 0.9 } }
    ];

    // Create tasks and filter out any that failed to parse
    const tasks = taskDefs.map(def => 
        createTemporalTask(def.termKey, def.punctuation, def.truthValue, def.occurrenceTime, def.endTime)
    ).filter(Boolean);
    
    if (tasks.length === 0) {
        console.log("No valid tasks could be created. Exiting demo.");
        return;
    }

    await system.addTasks(tasks);

    console.log("Running 5 cognitive cycles to demonstrate enhanced temporal reasoning...\n");
    
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

module.exports = enhancedTemporalReasoningDemo;

if (require.main === module) {
    enhancedTemporalReasoningDemo().catch(console.error);
}