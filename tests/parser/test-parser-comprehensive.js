const { parseTerm } = require('../src/parser/narseseParser');

// Test that the parser output matches what the Reasoner expects
console.log('Testing parser output compatibility with Reasoner:');

// Test cases that match the Reasoner's expectations
const testCases = [
    // Atomic terms
    { input: 'cat', expectedType: 'Atomic' },

    // Inheritance terms
    { input: '(cat --> mammal)', expectedType: 'Inheritance' },

    // Implication terms
    { input: '(cat ==> furry)', expectedType: 'Implication' },

    // Negation terms
    { input: '(--, cat)', expectedType: 'Negation' },

    // Conjunction terms
    { input: '(&, cat, dog)', expectedType: 'Conjunction' },

    // Disjunction terms
    { input: '(||, cat, dog)', expectedType: 'Disjunction' },

    // Extensional difference terms
    { input: '(#, cat, dog)', expectedType: 'ExtensionalDifference' },

    // Intensional difference terms
    { input: '(\\, cat, dog)', expectedType: 'IntensionalDifference' },

    // Instance terms
    { input: '(cat {-- animal)', expectedType: 'Instance' },

    // Property terms
    { input: '(cat --} furry)', expectedType: 'Property' }
];

testCases.forEach(testCase => {
    console.log(`\nTesting: ${testCase.input}`);
    const result = parseTerm(testCase.input);

    if (result) {
        console.log(`  Type: ${result.type}`);
        console.log(`  Expected: ${testCase.expectedType}`);
        console.log(`  Match: ${result.type === testCase.expectedType ? '✓' : '✗'}`);

        // Additional checks for specific types
        if (result.type === 'Inheritance' || result.type === 'Implication' ||
            result.type === 'Instance' || result.type === 'Property') {
            console.log(`  Has subject: ${Boolean(result.subject) ? '✓' : '✗'}`);
            console.log(`  Has predicate: ${Boolean(result.predicate) ? '✓' : '✗'}`);
        } else if (result.type === 'Negation') {
            console.log(`  Has term: ${Boolean(result.term) ? '✓' : '✗'}`);
        } else if (result.type === 'Conjunction' || result.type === 'Disjunction' ||
            result.type === 'ExtensionalDifference' || result.type === 'IntensionalDifference') {
            console.log(`  Has terms array: ${Array.isArray(result.terms) ? '✓' : '✗'}`);
            console.log(`  Terms count: ${result.terms ? result.terms.length : 0}`);
        }
    } else {
        console.log('  Failed to parse');
    }
});

// Test nested expressions
console.log('\n\nTesting nested expressions:');
const nestedTests = [
    '(cat --> (&, furry, intelligent))',
    '((||, cat, dog) --> mammal)',
    '(--, (cat --> furry))'
];

nestedTests.forEach(testCase => {
    console.log(`\nTesting: ${testCase}`);
    const result = parseTerm(testCase);
    if (result) {
        console.log('  Parsed successfully');
    } else {
        console.log('  Failed to parse');
    }
});
