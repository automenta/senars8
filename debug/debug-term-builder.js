const Term = require('../src/core/Term');
const {parseTerm} = require('../src/parser/narseseParser');

// Test the term builder that's causing the issue
try {
    const testTerm = {
        type: 'Inheritance',
        subject: {key: 'cat'},
        predicate: {key: 'animal'}
    };
    
    const termKey = Term.buildTermKey(testTerm);
    console.log('Generated term key:', termKey);
    
    const parsed = parseTerm(termKey);
    console.log('Parsed term:', JSON.stringify(parsed, null, 2));
} catch (error) {
    console.error('Error:', error.message);
}