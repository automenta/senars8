const {
    parseTerm
} = require('../src/parser/narseseParser');

const testCase = '(||,, cat, dog)';
console.log(`Testing: ${testCase}`);
const result = parseTerm(testCase);
console.log('Result:', JSON.stringify(result, null, 2));

const nestedTestCase = '((||,, cat, dog) --> mammal)';
console.log(`\nTesting: ${nestedTestCase}`);
const nestedResult = parseTerm(nestedTestCase);
console.log('Result:', JSON.stringify(nestedResult, null, 2));
