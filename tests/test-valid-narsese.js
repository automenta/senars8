const {parseTerm} = require('../src/parser/NewParser');

// Test the new parser with valid Narsese expressions
console.log('Testing new parser with valid Narsese expressions:');

const validTestCases = [
    'number',
    '(addition --> arithmetic_operation)',
    '(multiplication --> arithmetic_operation)',
    '(two --> number)',
    '(three --> number)',
    '(six --> number)',
    '((*, addition, two, three) --> five)',
    '((*, multiplication, two, three) --> six)',
    '(arith_op ==> result)',
    '((*, arith_op, x, y) ==> result)'
];

validTestCases.forEach(testCase => {
    console.log(`\nInput: ${testCase}`);
    const result = parseTerm(testCase);
    if (result) {
        console.log('✓ Parsed successfully');
        console.log('Type:', result.type);
        if (result.type === 'Inheritance' || result.type === 'Implication') {
            console.log('Subject:', JSON.stringify(result.subject));
            console.log('Predicate:', JSON.stringify(result.predicate));
        } else if (result.type === 'Conjunction') {
            console.log('Terms:', result.terms.length);
        }
    } else {
        console.log('✗ Failed to parse');
    }
});