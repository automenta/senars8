const System = require('../src/system/System');
const { createTask } = require('./demo-utils');
const Perception = require('../src/system/Perception');

/**
 * Enhanced Perception Demo
 * Demonstrates the system's enhanced perception capabilities.
 */
async function enhancedPerceptionDemo() {
    console.log("=== Enhanced Perception Demo ===\n");

    const system = new System();
    await system.initialize();

    // Initialize perception for direct testing
    const perception = new Perception(system.memory, system.lm);

    // Register custom sensory modalities
    perception.registerSensoryModality('visual', async (input) => {
        const tasks = [];
        const visualTask = new Task(
            parseTerm(`visual_input_${input.description || 'unknown'}`),
            '.',
            {frequency: input.confidence || 0.9, confidence: 0.8}
        );
        tasks.push(visualTask);
        return tasks;
    });

    perception.registerSensoryModality('auditory', async (input) => {
        const tasks = [];
        const auditoryTask = new Task(
            parseTerm(`auditory_input_${input.description || 'unknown'}`),
            '.',
            {frequency: input.confidence || 0.9, confidence: 0.8}
        );
        tasks.push(auditoryTask);
        return tasks;
    });

    // Add initial knowledge
    const taskDefs = [
        {termKey: '(perception_system_active)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.95}},
        {termKey: '(enhanced_perception_available)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.95}}
    ];

    const tasks = taskDefs.map(def => createTask(def.termKey, def.punctuation, def.truthValue)).filter(Boolean);

    if (tasks.length > 0) {
        await system.addTasks(tasks);
    }

    console.log("Running 3 cognitive cycles to demonstrate enhanced perception...\n");

    for (let i = 0; i < 3; i++) {
        const result = await system.runCycle();
        console.log(`Cycle ${i + 1}:`);
        console.log(`  - Derived Tasks: ${result.derivedTasks}`);
        console.log(`  - Contradictions: ${result.contradictions}`);
        console.log(`  - Meta Tasks: ${result.metaTasks}`);
        console.log();
    }

    // Direct Perception testing
    console.log("\n=== Direct Perception Testing ===");

    // Test attention focus
    console.log("\n1. Attention focus:");
    try {
        perception.setAttentionFocus('visual_analysis');
        console.log("  Set attention focus to 'visual_analysis'");

        // Process input with attention focus
        const focusTasks = await perception.processEvents([
            {type: 'observation', content: 'red_ball', confidence: 0.9}
        ]);
        console.log(`  Processed ${focusTasks.length} tasks with attention focus`);
    } catch (error) {
        console.log("  Error:", error.message);
    }

    // Test context stack
    console.log("\n2. Context stack:");
    try {
        perception.pushContext({location: 'kitchen', time: 'morning'});
        console.log("  Pushed context: { location: 'kitchen', time: 'morning' }");

        // Process input with context
        const contextTasks = await perception.processMultimodalInputWithContext({
            text: "I see a coffee maker",
            sensorData: [{type: 'temperature', value: 85, accuracy: 0.95}]
        });
        console.log(`  Processed ${contextTasks.length} tasks with context`);

        const poppedContext = perception.popContext();
        console.log("  Popped context:", poppedContext);
    } catch (error) {
        console.log("  Error:", error.message);
    }

    // Test custom sensory modalities
    console.log("\n3. Custom sensory modalities:");
    try {
        const visualTasks = await perception.processSensoryInput('visual', {
            description: 'red_sphere',
            confidence: 0.95
        });
        console.log(`  Processed ${visualTasks.length} visual tasks`);

        const auditoryTasks = await perception.processSensoryInput('auditory', {
            description: 'beeping_sound',
            confidence: 0.9
        });
        console.log(`  Processed ${auditoryTasks.length} auditory tasks`);
    } catch (error) {
        console.log("  Error:", error.message);
    }

    // Test advanced pattern detection
    console.log("\n4. Advanced pattern detection:");
    try {
        const eventStream = [
            {type: 'motion', timestamp: Date.now() - 10000, value: 1},
            {type: 'motion', timestamp: Date.now() - 9000, value: 1},
            {type: 'motion', timestamp: Date.now() - 8000, value: 1},
            {type: 'sound', timestamp: Date.now() - 7500, value: 0.8},
            {type: 'motion', timestamp: Date.now() - 7000, value: 1},
            {type: 'motion', timestamp: Date.now() - 6000, value: 1},
            {type: 'light', timestamp: Date.now() - 5000, value: 0.9}
        ];

        const patternTasks = await perception.processEventStreamAdvanced(eventStream);
        console.log(`  Detected ${patternTasks.length} advanced patterns`);

        if (patternTasks.length > 0) {
            console.log("  Sample patterns:");
            patternTasks.slice(0, 2).forEach((task, index) => {
                console.log(`    ${index + 1}. ${task.termKey}`);
            });
        }
    } catch (error) {
        console.log("  Error:", error.message);
    }

    // Test symbolic input processing
    console.log("\n5. Symbolic input processing:");
    try {
        const symbolicTasks = await perception.processSymbolicInput('(bird --> animal)');
        console.log(`  Processed ${symbolicTasks.length} symbolic tasks`);

        if (symbolicTasks.length > 0) {
            console.log(`  Created task: ${symbolicTasks[0].termKey}`);
        }
    } catch (error) {
        console.log("  Error:", error.message);
    }

    // Test analogical input processing
    console.log("\n6. Analogical input processing:");
    try {
        const analogyTasks = await perception.processAnalogicalInput({
            source: 'water_flow',
            target: 'electricity_flow',
            mapping: {'pressure': 'voltage', 'flow_rate': 'current'}
        });
        console.log(`  Processed ${analogyTasks.length} analogy tasks`);
    } catch (error) {
        console.log("  Error:", error.message);
    }

    // Test uncertain input processing
    console.log("\n7. Uncertain input processing:");
    try {
        const uncertainTasks = await perception.processUncertainInput({
            term: 'possibly_raining',
            punctuation: '.',
            frequency: 0.6,
            confidence: 0.4,
            alternatives: [
                {term: 'definitely_raining', frequency: 0.8, confidence: 0.3},
                {term: 'not_raining', frequency: 0.2, confidence: 0.3}
            ]
        });
        console.log(`  Processed ${uncertainTasks.length} uncertain tasks`);
    } catch (error) {
        console.log("  Error:", error.message);
    }

    // Test perception history
    console.log("\n8. Perception history:");
    try {
        const history = perception.getPerceptionHistory();
        console.log(`  Perception history contains ${history.length} records`);

        if (history.length > 0) {
            const lastRecord = history[history.length - 1];
            console.log(`  Last record: ${lastRecord.type} with ${lastRecord.tasks} tasks`);
        }
    } catch (error) {
        console.log("  Error:", error.message);
    }

    console.log("\n=== Demo Complete ===");
}

module.exports = enhancedPerceptionDemo;

if (require.main === module) {
    enhancedPerceptionDemo().catch(console.error);
}