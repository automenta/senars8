const Task = require('../src/core/Task');
const {parseTerm} = require('../src/parser/NewParser');

test('should create a new Task object', () => {
    const term = parseTerm('cat');
    const task = new Task(term, '.');
    expect(task).toBeInstanceOf(Task);
});
