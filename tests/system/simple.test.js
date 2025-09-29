import Task from '../../core/core/Task.js';
import {parseTerm} from '../../core/parser/narseseParser.js';

test('should create a new Task object', () => {
    const term = parseTerm('cat');
    const task = new Task(term, '.');
    expect(task).toBeInstanceOf(Task);
});
