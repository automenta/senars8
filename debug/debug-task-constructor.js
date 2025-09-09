const {parseTerm} = require('../src/parser/narseseParser');
const Task = require('../src/core/Task');
const Term = require('../src/core/Term');

// Debug the Task constructor
console.log('Testing Task constructor...');

// Create a Term object
const termA = new Term('cat', [], 1);
console.log('termA:', termA);
console.log('termA.type:', termA.type);

// Create a task with the Term object
const task = new Task(termA, '.');
console.log('task.term:', task.term);
console.log('task.term === termA:', task.term === termA);