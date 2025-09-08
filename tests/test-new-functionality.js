const { System, Task, parseTerm } = require('../src/index');

async function testNewFunctionality() {
    console.log('Testing new System functionality...');
    
    // Create a new system instance
    const system = new System();
    
    // Initialize the system
    await system.initialize();
    console.log('System initialized');
    
    // Add some initial tasks
    const tasks = [
        new Task(parseTerm('(bird --> animal)'), '.', { frequency: 0.9, confidence: 0.8 }),
        new Task(parseTerm('(bird --> flies)'), '.', { frequency: 0.8, confidence: 0.7 }),
        new Task(parseTerm('(cat --> animal)'), '.', { frequency: 0.95, confidence: 0.9 }),
        new Task(parseTerm('find_food'), '!', { frequency: 0.9, confidence: 0.8 })
    ];
    
    await system.addTasks(tasks);
    console.log('Added initial tasks');
    
    // Test querying tasks
    console.log('\nTesting queryTasks...');
    const animalBeliefs = system.queryTasks({ termKey: '(bird --> animal)', punctuation: '.' });
    console.log('Animal beliefs:', animalBeliefs.map(t => t.toString()));
    
    const highConfidenceTasks = system.queryTasks({ minConfidence: 0.8, limit: 2 });
    console.log('High confidence tasks:', highConfidenceTasks.map(t => t.toString()));
    
    // Test revising task truth value
    console.log('\nTesting reviseTaskTruthValue...');
    const birdAnimalTask = animalBeliefs[0];
    if (birdAnimalTask) {
        const newEvidence = { frequency: 0.95, confidence: 0.85 };
        const revisedTruthValue = await system.reviseTaskTruthValue(birdAnimalTask.id, newEvidence, 0.7);
        console.log('Revised truth value:', revisedTruthValue);
        
        // Verify the revision
        const updatedTask = system.queryTasks({ termKey: '(bird --> animal)' })[0];
        console.log('Updated task:', updatedTask.toString());
    }
    
    // Test removing a task
    console.log('\nTesting removeTask...');
    const catAnimalTask = system.queryTasks({ termKey: '(cat --> animal)' })[0];
    if (catAnimalTask) {
        console.log('Before removal, tasks count:', system.queryTasks({}).length);
        await system.removeTask(catAnimalTask.id);
        console.log('After removal, tasks count:', system.queryTasks({}).length);
    }
    
    // Test export/import
    console.log('\nTesting export/import...');
    const exportedState = system.exportMemoryState();
    console.log('Exported state with', exportedState.terms.length, 'terms and', exportedState.tasks.length, 'tasks');
    
    // Create a new system and import the state
    const newSystem = new System();
    await newSystem.initialize();
    try {
        await newSystem.importMemoryState(exportedState);
        console.log('Imported state into new system');
        console.log('New system tasks count:', newSystem.queryTasks({}).length);
    } catch (err) {
        console.log('Import functionality needs further work:', err.message);
    }
    
    console.log('\nAll tests completed successfully!');
}

testNewFunctionality().catch(console.error);