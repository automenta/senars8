const Term = require('../src/core/Term');

// Test what happens when we pass invalid structures to buildTermKey
console.log('Testing buildTermKey with various inputs...');

// Test 1: Valid structure
try {
    const validStructure = {
        type: 'Inheritance',
        subject: { type: 'Atomic', key: 'cat' },
        predicate: { type: 'Atomic', key: 'animal' }
    };
    const result1 = Term.buildTermKey(validStructure);
    console.log('Test 1 (valid structure):', result1);
} catch (error) {
    console.error('Test 1 error:', error.message);
}

// Test 2: Invalid structure with missing properties
try {
    const invalidStructure = {
        type: 'Inheritance',
        subject: { key: 'cat' },  // Missing type
        predicate: { key: 'animal' }  // Missing type
    };
    const result2 = Term.buildTermKey(invalidStructure);
    console.log('Test 2 (invalid structure):', result2);
} catch (error) {
    console.error('Test 2 error:', error.message);
}

// Test 3: Structure with null/undefined values
try {
    const nullStructure = {
        type: 'Inheritance',
        subject: null,
        predicate: { type: 'Atomic', key: 'animal' }
    };
    const result3 = Term.buildTermKey(nullStructure);
    console.log('Test 3 (null subject):', result3);
} catch (error) {
    console.error('Test 3 error:', error.message);
}