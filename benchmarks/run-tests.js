// benchmarks/run-tests.js
const CognitiveTestSuite = require('./CognitiveTestSuite');

async function runBenchmark() {
    console.log('=== SeNARS Cognitive Benchmark ===\n');
    
    const testSuite = new CognitiveTestSuite();
    
    try {
        const results = await testSuite.runAllTests();
        testSuite.generateReport();
        
        console.log('\n=== Benchmark Complete ===');
    } catch (error) {
        console.error('Benchmark failed:', error);
    }
}

if (require.main === module) {
    runBenchmark();
}

module.exports = runBenchmark;