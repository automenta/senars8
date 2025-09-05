const MetaCognition = require('./src/system/MetaCognition');
const Task = require('./src/core/Task');
const {parseTerm} = require('./src/parser/NewParser');

async function testEnhancedMetaCognition() {
    console.log("=== Testing Enhanced Meta-Cognition ===\n");

    const metaCognition = new MetaCognition();

    // Create tasks with various types of contradictions
    const taskDefs = [
        // Direct negation
        {termKey: 'bird', punctuation: '.', truthValue: {frequency: 0.9, confidence: 0.9}},
        {termKey: '(--, bird)', punctuation: '.', truthValue: {frequency: 0.9, confidence: 0.8}},

        // Inheritance conflict
        {termKey: '(robin --> bird)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.95}},
        {termKey: '(robin --> (--, bird))', punctuation: '.', truthValue: {frequency: 0.9, confidence: 0.9}},

        // Conjunction conflict
        {termKey: '(&, bird, can_fly)', punctuation: '.', truthValue: {frequency: 0.8, confidence: 0.85}},
        {termKey: '(&, bird, (--, can_fly))', punctuation: '.', truthValue: {frequency: 0.7, confidence: 0.8}},

        // Disjunction conflict
        {termKey: '(|, bird, mammal)', punctuation: '.', truthValue: {frequency: 0.6, confidence: 0.7}},
        {termKey: '(|, (--, bird), mammal)', punctuation: '.', truthValue: {frequency: 0.65, confidence: 0.75}},

        // Temporal conflict
        {
            termKey: 'flies',
            punctuation: '.',
            truthValue: {frequency: 0.9, confidence: 0.9},
            stamp: {creationTime: Date.now(), occurrenceTime: Date.now() - 10000}
        },
        {
            termKey: 'flies',
            punctuation: '.',
            truthValue: {frequency: 0.2, confidence: 0.85},
            stamp: {creationTime: Date.now(), occurrenceTime: Date.now() - 5000}
        },

        // Goal conflict
        {termKey: 'stay_alive', punctuation: '!', truthValue: {frequency: 1.0, confidence: 0.95}},
        {termKey: '(--, stay_alive)', punctuation: '!', truthValue: {frequency: 1.0, confidence: 0.9}}
    ];

    // Create tasks
    const tasks = [];
    for (const def of taskDefs) {
        const parsedTerm = parseTerm(def.termKey);
        if (parsedTerm) {
            const task = new Task(
                parsedTerm,
                def.punctuation,
                def.truthValue,
                def.stamp || {creationTime: Date.now()}
            );
            tasks.push(task);
            console.log(`Created task: ${task.termKey}${task.punctuation}`);
        } else {
            console.log(`Failed to parse term: ${def.termKey}`);
        }
    }

    console.log("\nFinding contradictions...\n");
    const contradictions = metaCognition.findContradictions(tasks);

    console.log(`Found ${contradictions.length} contradictions:`);
    for (let i = 0; i < contradictions.length; i++) {
        const contradiction = contradictions[i];
        console.log(`${i + 1}. Type: ${contradiction.type}`);
        console.log(`   Confidence: ${contradiction.confidence.toFixed(3)}`);
        console.log(`   Severity: ${(contradiction.severity || 0).toFixed(3)}`);
        console.log(`   Details: ${contradiction.details}`);
        console.log(`   Tasks:`);
        for (const task of contradiction.tasks) {
            console.log(`     - ${task.termKey}${task.punctuation} (freq: ${task.state.truthValue.frequency.toFixed(3)}, conf: ${task.state.truthValue.confidence.toFixed(3)})`);
        }
        console.log();
    }

    // Try to resolve contradictions with different strategies
    if (contradictions.length > 0) {
        console.log("Resolving contradictions with different strategies...\n");

        const strategies = ['auto', 'revision', 'reconciliation', 'truth_value_revision', 'causal_analysis', 'hierarchical_reconciliation'];

        for (const strategy of strategies) {
            console.log(`Resolution using ${strategy} strategy:`);
            let totalTasks = 0;
            for (const contradiction of contradictions) {
                const resolutionTasks = metaCognition.resolve(contradiction, strategy);
                totalTasks += resolutionTasks.length;
                console.log(`  Contradiction ${contradiction.type}: Generated ${resolutionTasks.length} meta-tasks`);
            }
            console.log(`  Total meta-tasks generated: ${totalTasks}\n`);
        }
    }

    console.log("=== Test Complete ===");
}

testEnhancedMetaCognition().catch(console.error);