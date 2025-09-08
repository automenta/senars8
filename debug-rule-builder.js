const {parseTerm} = require('./src/parser/narseseParser');
const Task = require('./src/core/Task');
const Term = require('./src/core/Term');

// Test the exact scenario from the test with our fix
async function debugTest() {
    // Create terms like in the test
    const termA = new Term('cat', [], 1);
    const termB = new Term('mammal', [], 1);
    
    // Create tasks like in the test
    const task1 = new Task(parseTerm('(cat ==> mammal)'), '.');
    const task2 = new Task(termA, '.');
    
    console.log('task1:', task1);
    console.log('task2:', task2);
    
    // Simulate what happens in the rule builder with our fix
    const parsedTasks = [task1, task2].map(t => {
        // If it's a Term object, get its parsed structure
        if (t.term && typeof t.term._getStructure === 'function') {
            return t.term._getStructure();
        }
        // Otherwise, use the term directly
        return t.term;
    });
    
    console.log('parsedTasks after fix:', parsedTasks);
    
    // Try to access the properties like in the inheritance rule
    const parsed1 = parsedTasks[0];
    const parsed2 = parsedTasks[1];
    
    console.log('parsed1.type:', parsed1?.type);
    console.log('parsed2.type:', parsed2?.type);
    console.log('parsed1.predicate:', parsed1?.predicate);
    console.log('parsed2.subject:', parsed2?.subject);
    
    // Try the condition from the inheritance rule
    const condition = 
        parsed1?.type === 'Implication' &&
        parsed2?.type === 'Atomic' &&
        parsed1.predicate.key === parsed2.key;
        
    console.log('Condition result:', condition);
    
    // Try the action from the inheritance rule
    if (condition) {
        const newTermKey = `(${parsed1.subject.key} ==> ${parsed2.key})`;
        console.log('Generated newTermKey:', newTermKey);
        
        const parsedTerm = parseTerm(newTermKey);
        console.log('Parsed new term:', parsedTerm);
    }
}

debugTest().catch(console.error);