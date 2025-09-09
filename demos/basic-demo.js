const { System } = require('../src/index');
const {createTask} = require('../shared/demo-utils');

async function runBasicDemo() {
    console.log('Starting basic demo...');
    
    // Create a new system instance
    const system = new System();
    
    // Initialize the system
    await system.initialize();
    console.log('System initialized');
    
    // Add some initial tasks using correct parentheses syntax and proper parsing
    const taskDefs = [
        {termKey: 'bird', punctuation: '.', truthValue: { frequency: 0.9, confidence: 0.8 }},
        {termKey: 'flies', punctuation: '.', truthValue: { frequency: 0.8, confidence: 0.7 }},
        {termKey: '(bird --> flies)', punctuation: '.', truthValue: { frequency: 0.9, confidence: 0.8 }},
        {termKey: '(bird --> animal)', punctuation: '.', truthValue: { frequency: 1.0, confidence: 0.9 }},
        {termKey: '(animal --> living)', punctuation: '.', truthValue: { frequency: 1.0, confidence: 0.95 }},
        {termKey: '((&,bird,living) --> animal)', punctuation: '!', truthValue: { frequency: 0.9, confidence: 0.8 }}
    ];
    
    // Create tasks using proper parsing
    const tasks = taskDefs.map(def => createTask(def.termKey, def.punctuation, def.truthValue)).filter(Boolean);
    
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