const {parseTerm} = require('../src/parser/narseseParser');

// Test what the original parser returns
console.log('Testing original parser output:');

const testCases = [
    '(&&, a, b)',
    '(--, a)'
];

testCases.forEach(testCase => {
    console.log(`\nInput: ${testCase}`);
    const result = parseTerm(testCase);
    console.log('Output:', JSON.stringify(result, null, 2));
});
