const {parseTerm} = require('./src/parser/TermParser');

// Test the new parser with various inputs
console.log('Testing new parser implementation:');

const testCases = [
    'cat',
    '(cat --> mammal)',
    '(cat ==> furry)',
    '(--,, cat)',
    '(&,, cat, dog)',
    '(||,, cat, dog)',
    '(#,, cat, dog)',
    '(\\,, cat, dog)',  // Corrected intensional difference syntax
    '(cat {-- animal)',
    '(cat --} furry)'
];

testCases.forEach(testCase => {
    console.log(`\nInput: ${testCase}`);
    const result = parseTerm(testCase);
    console.log('Output:', JSON.stringify(result, null, 2));
});