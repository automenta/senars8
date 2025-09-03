const System = require('../src/system/System');
const Task = require('../src/core/Task');

/**
 * Comprehensive System Demo
 * Demonstrates the full capabilities of the SeNARS system.
 */
async function comprehensiveDemo() {
    console.log("=== Comprehensive SeNARS System Demo ===\n");

    try {
        // Create and initialize the system
        const system = new System();
        await system.initialize();
        
        // Add some initial knowledge to the system
        console.log("Adding initial knowledge...");
        
        const initialKnowledge = [
            // Taxonomic knowledge
            new Task('(cat --> mammal)', '.', {frequency: 1.0, confidence: 0.9}),
            new Task('(mammal --> animal)', '.', {frequency: 1.0, confidence: 0.95}),
            new Task('(bird --> animal)', '.', {frequency: 1.0, confidence: 0.95}),
            new Task('(penguin --> bird)', '.', {frequency: 1.0, confidence: 0.8}),
            new Task('(penguin --> swimmer)', '.', {frequency: 0.9, confidence: 0.85}),
            
            // Properties
            new Task('(cat --} furry)', '.', {frequency: 0.95, confidence: 0.9}),
            new Task('(bird --} winged)', '.', {frequency: 1.0, confidence: 0.95}),
            
            // Instances
            new Task('(garfield {-- cat)', '.', {frequency: 1.0, confidence: 0.99}),
            new Task('(tweety {-- bird)', '.', {frequency: 1.0, confidence: 0.99}),
            
            // Implications
            new Task('((&, animal, hungry) ==> seek_food)', '.', {frequency: 0.9, confidence: 0.8}),
            new Task('((&, cat, see, mouse) ==> chase)', '.', {frequency: 0.8, confidence: 0.7}),
            
            // Goals
            new Task('(understand_ecosystem)', '!', {frequency: 1.0, confidence: 0.9}),
            new Task('(classify_garfield)', '!', {frequency: 1.0, confidence: 0.9}),
        ];
        
        await system.addTasks(initialKnowledge);
        console.log(`Added ${initialKnowledge.length} initial knowledge tasks\n`);
        
        // Run several cognitive cycles to demonstrate reasoning
        console.log("Running cognitive cycles...\n");
        
        for (let i = 0; i < 5; i++) {
            console.log(`--- Cycle ${i + 1} ---`);
            const result = await system.runCycle();
            
            console.log(`Derived ${result.derivedTasks} new tasks`);
            if (result.contradictions > 0) {
                console.log(`Found ${result.contradictions} contradictions`);
            }
            if (result.metaTasks > 0) {
                console.log(`Generated ${result.metaTasks} meta-cognition tasks`);
            }
            
            // Show top priority tasks
            const topTasks = system.memory.getHighestPriorityTasks(3);
            console.log("Top priority tasks:");
            topTasks.forEach((task, index) => {
                console.log(`  ${index + 1}. ${task.termKey}${task.punctuation} (Priority: ${task.state.priority.toFixed(3)})`);
            });
            
            console.log("");
        }
        
        // Show final state
        const allTasks = system.memory.getAllTasks();
        const beliefs = allTasks.filter(t => t.punctuation === '.');
        const goals = allTasks.filter(t => t.punctuation === '!');
        const questions = allTasks.filter(t => t.punctuation === '?');
        
        console.log("=== Final System State ===");
        console.log(`Total tasks: ${allTasks.length}`);
        console.log(`Beliefs: ${beliefs.length}`);
        console.log(`Goals: ${goals.length}`);
        console.log(`Questions: ${questions.length}`);
        
        console.log("\n=== Sample Tasks ===");
        console.log("Some interesting derived tasks:");
        const derivedTasks = allTasks.filter(t => t.state.stamp.creationTime > Date.now() - 60000);
        derivedTasks.slice(0, 5).forEach(task => {
            console.log(`- ${task.termKey}${task.punctuation}`);
        });
        
        console.log("\n=== Comprehensive Demo Complete ===");
        return {
            totalTasks: allTasks.length,
            beliefs: beliefs.length,
            goals: goals.length,
            questions: questions.length,
            derivedTasks: derivedTasks.length
        };
        
    } catch (error) {
        console.error("Demo failed:", error);
        throw error;
    }
}

// Run the demo if this file is executed directly
if (require.main === module) {
    comprehensiveDemo().then(results => {
        console.log("Demo results:", results);
    }).catch(error => {
        console.error("Demo failed:", error);
        process.exit(1);
    });
}

module.exports = comprehensiveDemo;