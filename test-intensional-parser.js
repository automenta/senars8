const {parseTerm} = require('./src/parser/TermParser');

// Test just the intensional difference
const testCase = '(\\,, cat, dog)';
console.log(`Input: ${testCase}`);
const result = parseTerm(testCase);
console.log('Output:', JSON.stringify(result, null, 2));