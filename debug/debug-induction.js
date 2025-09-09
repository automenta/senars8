const Term = require('../src/core/Term');
const {parseTerm} = require('../src/parser/narseseParser');

// Test the induction rule condition and action
console.log('Testing induction rule...');

// Simulate two parsed inheritance terms with the same predicate
const parsed1 = {
    type: 'Inheritance',
    subject: { type: 'Atomic', key: 'cat' },
    predicate: { type: 'Atomic', key: 'animal' }
};

const parsed2 = {
    type: 'Inheritance',
    subject: { type: 'Atomic', key: 'dog' },
    predicate: { type: 'Atomic', key: 'animal' }  // Same predicate
};

console.log('parsed1:', parsed1);
console.log('parsed2:', parsed2);

// Check the induction rule condition
const condition = 
    parsed1?.type === 'Inheritance' &&
    parsed2?.type === 'Inheritance' &&
    Term.buildTermKey(parsed1.predicate) === Term.buildTermKey(parsed2.predicate) &&
    Term.buildTermKey(parsed1.subject) !== Term.buildTermKey(parsed2.subject);

console.log('Condition result:', condition);

// If condition is true, test the term builder
if (condition) {
    const newTermKey = Term.buildTermKey({
        type: 'Inheritance',
        subject: parsed1.subject,
        predicate: parsed2.subject
    });
    
    console.log('Generated newTermKey:', newTermKey);
    
    // Try to parse the generated term key
    try {
        const parsedTerm = parseTerm(newTermKey);
        console.log('Parsed term:', parsedTerm);
    } catch (error) {
        console.error('Parsing error:', error.message);
    }
}