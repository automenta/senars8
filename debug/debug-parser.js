const {parseTerm} = require('../src/parser/narseseParser');

// Test cases that might be causing the issue
const testCases = [
    '<cat --> animal>',
    '(cat --> animal)',
    '<cat ==> animal>',
    '(cat ==> animal)',
    '(&&, <cat --> animal>, <dog --> animal>)',
    // Add more test cases as needed
];

console.log('Testing parser with various inputs:');
testCases.forEach((testCase, index) => {
    try {
        console.log(`\nTest ${index + 1}: ${testCase}`);
        const result = parseTerm(testCase);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error(`Error in test ${index + 1}:`, error.message);
    }
});