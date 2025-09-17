const MetaCognition = require('../src/system/MetaCognition');
const Task = require('../src/core/Task');
const {
    parseTerm
} = require('../src/parser/narseseParser');

function printContradictions(contradictions) {
    console.log(`Found ${contradictions.length} contradictions:`);
    contradictions.forEach((c, i) => {
        console.log(`${i + 1}. Type: ${c.type}`);
        console.log(`   Confidence: ${c.confidence.toFixed(3)}`);
        console.log(`   Severity: ${(c.severity || 0).toFixed(3)}`);
        console.log(`   Details: ${c.details}`);
        console.log('   Tasks:');
        c.tasks.forEach(t => console.log(`     - ${t.termKey}${t.punctuation} (f: ${t.state.truthValue.frequency.toFixed(3)}, c: ${t.state.truthValue.confidence.toFixed(3)})`));
        console.log();
    });
}

async function testEnhancedMetaCognition() {
    console.log('=== Testing Enhanced Meta-Cognition ===\n');
    const metaCognition = new MetaCognition();
    const taskDefs = [{
        termKey: 'bird',
        punctuation: '.',
        truthValue: {
            frequency: 0.9,
            confidence: 0.9
        }
    }, {
        termKey: '(--, bird)',
        punctuation: '.',
        truthValue: {
            frequency: 0.9,
            confidence: 0.8
        }
    }, {
        termKey: '(robin --> bird)',
        punctuation: '.',
        truthValue: {
            frequency: 1.0,
            confidence: 0.95
        }
    }, {
        termKey: '(robin --> (--, bird))',
        punctuation: '.',
        truthValue: {
            frequency: 0.9,
            confidence: 0.9
        }
    }, {
        termKey: '(&, bird, can_fly)',
        punctuation: '.',
        truthValue: {
            frequency: 0.8,
            confidence: 0.85
        }
    }, {
        termKey: '(&, bird, (--, can_fly))',
        punctuation: '.',
        truthValue: {
            frequency: 0.7,
            confidence: 0.8
        }
    }, {
        termKey: '(|, bird, mammal)',
        punctuation: '.',
        truthValue: {
            frequency: 0.6,
            confidence: 0.7
        }
    }, {
        termKey: '(|, (--, bird), mammal)',
        punctuation: '.',
        truthValue: {
            frequency: 0.65,
            confidence: 0.75
        }
    }, {
        termKey: 'flies',
        punctuation: '.',
        truthValue: {
            frequency: 0.9,
            confidence: 0.9
        },
        stamp: {
            creationTime: Date.now(),
            occurrenceTime: Date.now() - 10000
        }
    }, {
        termKey: 'flies',
        punctuation: '.',
        truthValue: {
            frequency: 0.2,
            confidence: 0.85
        },
        stamp: {
            creationTime: Date.now(),
            occurrenceTime: Date.now() - 5000
        }
    }, {
        termKey: 'stay_alive',
        punctuation: '!',
        truthValue: {
            frequency: 1.0,
            confidence: 0.95
        }
    }, {
        termKey: '(--, stay_alive)',
        punctuation: '!',
        truthValue: {
            frequency: 1.0,
            confidence: 0.9
        }
    },];

    const tasks = taskDefs.map(def => {
        const parsedTerm = parseTerm(def.termKey);
        if (parsedTerm) {
            const task = new Task(parsedTerm, def.punctuation, def.truthValue, def.stamp || {
                creationTime: Date.now()
            });
            console.log(`Created task: ${task.termKey}${task.punctuation}`);
            return task;
        }
        console.log(`Failed to parse term: ${def.termKey}`);
        return null;
    }).filter(Boolean);

    console.log('\nFinding contradictions...\n');
    const contradictions = metaCognition.findContradictions(tasks);
    printContradictions(contradictions);

    if (contradictions.length > 0) {
        console.log('Resolving contradictions with different strategies...\n');
        const strategies = ['auto', 'revision', 'reconciliation', 'truth_value_revision', 'causal_analysis', 'hierarchical_reconciliation'];
        for (const strategy of strategies) {
            console.log(`Resolution using ${strategy} strategy:`);
            const totalTasks = contradictions.reduce((acc, c) => acc + metaCognition.resolve(c, strategy).length, 0);
            console.log(`  Total meta-tasks generated: ${totalTasks}\n`);
        }
    }

    console.log('=== Test Complete ===');
}

testEnhancedMetaCognition().catch(console.error);
