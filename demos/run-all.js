const path = require('path');

async function runAllDemos() {
    const demos = [
        'math-inference.js',
        'planning-demo.js',
        'comprehensive-system-demo.js',
        'nlp-integration-demo.js',
        'contradiction-resolution-demo.js',
        'enhanced-temporal-reasoning-demo.js',
        'advanced-lm-demo.js',
        'enhanced-contradiction-resolution-demo.js',
        'extended-action-execution-demo.js',
        'enhanced-perception-demo.js',
        'extended-inference-rules-demo.js',
        'advanced-truth-value-revision-demo.js',
        'enhanced-narsese-demo.js',
        'debug-contradictions.js'
    ];

    for (const demoName of demos) {
        try {
            console.log(`\n=== Running ${demoName} ===`);
            const demo = require(path.join(__dirname, demoName));
            await demo();
        } catch (error) {
            console.error(`Error running ${demoName}:`, error.message);
        }
    }
}

module.exports = runAllDemos;