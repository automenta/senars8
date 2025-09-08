const { System, Task, Term, parseTerm } = require('../src/index');

async function runBasicDemo() {
    console.log('Starting basic demo...');
    
    // Create a new system instance
    const system = new System();
    
    // Initialize the system
    await system.initialize();
    console.log('System initialized');
    
    // Add some initial tasks
    const tasks = [
        new Task({key: 'bird'}, '.', { frequency: 0.9, confidence: 0.8 }),
        new Task({key: 'flies'}, '.', { frequency: 0.8, confidence: 0.7 }),
        new Task({key: '<bird --> flies>'}, '.', { frequency: 0.9, confidence: 0.8 }),
        new Task({key: '<bird --> animal>'}, '.', { frequency: 1.0, confidence: 0.9 }),
        new Task({key: '<animal --> living>'}, '.', { frequency: 1.0, confidence: 0.95 }),
        new Task({key: '<(&,bird,living) --> animal>'}, '!', { frequency: 0.9, confidence: 0.8 })
    ];
    
    await system.addTasks(tasks);
    console.log('Added initial tasks');
    
    // Run a few cycles
    console.log('Running system cycles...');
    for (let i = 0; i < 5; i++) {
        console.log(`Running cycle ${i + 1}`);
        const result = await system.runCycle();
        console.log(`Cycle ${i + 1} completed:`, {
            derivedTasks: result.derivedTasks,
            contradictions: result.contradictions,
            metaTasks: result.metaTasks,
            proactiveTasks: result.proactiveTasks
        });
    }
    
    console.log('Demo completed');
}

runBasicDemo().catch(console.error);