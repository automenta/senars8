const {parseTerm} = require('./src/parser/narseseParser');
const Task = require('./src/core/Task');
const Term = require('./src/core/Term');

// Test the exact scenario from the test
async function debugTest() {
    // Create terms like in the test
    const termA = new Term('cat', [], 1);
    const termB = new Term('mammal', [], 1);
    
    console.log('termA:', termA);
    console.log('termB:', termB);
    
    // Create tasks like in the test
    const task1 = new Task(parseTerm('(cat ==> mammal)'), '.');
    const task2 = new Task(termA, '.');
    
    console.log('task1.term:', task1.term);
    console.log('task2.term:', task2.term);
    
    // Simulate what happens in the rule builder
    const parsedTasks = [task1, task2].map(t => t.term);
    console.log('parsedTasks:', parsedTasks);
    
    // Try to access the properties like in the inheritance rule
    const parsed1 = parsedTasks[0];
    const parsed2 = parsedTasks[1];
    
    console.log('parsed1:', parsed1);
    console.log('parsed2:', parsed2);
    
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
}

debugTest().catch(console.error);