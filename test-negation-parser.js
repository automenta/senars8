const {parseTerm} = require('./src/parser/TermParser');

// Test just the negation
const testCase = '(--,, cat)';
console.log(`Input: ${testCase}`);
const result = parseTerm(testCase);
console.log('Output:', JSON.stringify(result, null, 2));