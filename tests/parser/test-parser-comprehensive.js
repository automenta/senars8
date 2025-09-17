const {
    parseTerm
} = require('../src/parser/narseseParser');

console.log('Testing parser output compatibility with Reasoner:');

const testCases = [{
    input: 'cat',
    expectedType: 'Atomic'
}, {
    input: '(cat --> mammal)',
    expectedType: 'Inheritance'
}, {
    input: '(cat ==> furry)',
    expectedType: 'Implication'
}, {
    input: '(--, cat)',
    expectedType: 'Negation'
}, {
    input: '(&, cat, dog)',
    expectedType: 'Conjunction'
}, {
    input: '(||, cat, dog)',
    expectedType: 'Disjunction'
}, {
    input: '(#, cat, dog)',
    expectedType: 'ExtensionalDifference'
}, {
    input: '(\\, cat, dog)',
    expectedType: 'IntensionalDifference'
}, {
    input: '(cat {-- animal)',
    expectedType: 'Instance'
}, {
    input: '(cat --} furry)',
    expectedType: 'Property'
}, ];

testCases.forEach(testCase => {
    console.log(`\nTesting: ${testCase.input}`);
    const result = parseTerm(testCase.input);

    if (result) {
        console.log(`  Type: ${result.type}`);
        console.log(`  Expected: ${testCase.expectedType}`);
        console.log(`  Match: ${result.type === testCase.expectedType ? '✓' : '✗'}`);

        if (['Inheritance', 'Implication', 'Instance', 'Property'].includes(result.type)) {
            console.log(`  Has subject: ${result.subject ? '✓' : '✗'}`);
            console.log(`  Has predicate: ${result.predicate ? '✓' : '✗'}`);
        } else if (result.type === 'Negation') {
            console.log(`  Has term: ${result.term ? '✓' : '✗'}`);
        } else if (['Conjunction', 'Disjunction', 'ExtensionalDifference', 'IntensionalDifference'].includes(result.type)) {
            console.log(`  Has terms array: ${Array.isArray(result.terms) ? '✓' : '✗'}`);
            console.log(`  Terms count: ${result.terms ? result.terms.length : 0}`);
        }
    } else {
        console.log('  Failed to parse');
    }
});

console.log('\n\nTesting nested expressions:');
const nestedTests = [
    '(cat --> (&, furry, intelligent))',
    '((||, cat, dog) --> mammal)',
    '(--, (cat --> furry))',
];

nestedTests.forEach(testCase => {
    console.log(`\nTesting: ${testCase}`);
    const result = parseTerm(testCase);
    console.log(result ? '  Parsed successfully' : '  Failed to parse');
});
