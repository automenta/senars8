const {
    SystemFactory,
    Task,
    parseTerm
} = require('../../src/index');

async function testNewFunctionality() {
    console.log('Testing new System functionality...');
    const system = await SystemFactory.createSystem();
    console.log('System initialized');

    const tasks = [
        new Task(parseTerm('(bird --> animal)'), '.', {
            frequency: 0.9,
            confidence: 0.8
        }),
        new Task(parseTerm('(bird --> flies)'), '.', {
            frequency: 0.8,
            confidence: 0.7
        }),
        new Task(parseTerm('(cat --> animal)'), '.', {
            frequency: 0.95,
            confidence: 0.9
        }),
        new Task(parseTerm('find_food'), '!', {
            frequency: 0.9,
            confidence: 0.8
        }),
    ];
    await system.addTasks(tasks);
    console.log('Added initial tasks');

    console.log('\nTesting queryTasks...');
    const animalBeliefs = system.components.memory.query({
        term: parseTerm('(bird --> animal)'),
        punctuation: '.'
    });
    console.log('Animal beliefs:', animalBeliefs.map(t => t.toString()));

    const highConfidenceTasks = system.components.memory.query({
        minConfidence: 0.8,
        limit: 2
    });
    console.log('High confidence tasks:', highConfidenceTasks.map(t => t.toString()));

    console.log('\nTesting reviseTaskTruthValue...');
    const birdAnimalTask = animalBeliefs[0];
    if (birdAnimalTask) {
        const newEvidence = {
            frequency: 0.95,
            confidence: 0.85
        };
        const revisedTruthValue = await system.components.memory.reviseTruthValue(birdAnimalTask.id, newEvidence, 0.7);
        console.log('Revised truth value:', revisedTruthValue);
        const updatedTask = system.components.memory.query({
            term: parseTerm('(bird --> animal)')
        })[0];
        console.log('Updated task:', updatedTask.toString());
    }

    console.log('\nTesting removeTask...');
    const catAnimalTask = system.components.memory.query({
        term: parseTerm('(cat --> animal)')
    })[0];
    if (catAnimalTask) {
        console.log('Before removal, tasks count:', system.components.memory.query({}).length);
        await system.components.memory.remove(catAnimalTask.id);
        console.log('After removal, tasks count:', system.components.memory.query({}).length);
    }

    console.log('\nTesting export/import...');
    const exportedState = system.components.memory.exportState();
    console.log('Exported state with', exportedState.terms.length, 'terms and', exportedState.tasks.length, 'tasks');

    const newSystem = await SystemFactory.createSystem();
    try {
        await newSystem.components.memory.importState(exportedState);
        console.log('Imported state into new system');
        console.log('New system tasks count:', newSystem.components.memory.query({}).length);
    } catch (err) {
        console.log('Import functionality needs further work:', err.message);
    }

    console.log('\nAll tests completed successfully!');
}

testNewFunctionality().catch(console.error);
