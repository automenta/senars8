import Memory from '../../src/memory/Memory.js';
import Task from '../../src/core/Task.js';
import {
    parseTerm
} from '../../src/parser/narseseParser.js';
import ConfigManager from '../../src/config/ConfigManager.js';

describe('Memory Indexing', () => {
    let memory;

    beforeEach(() => {
        const configManager = new ConfigManager();
        memory = new Memory(configManager);
    });

    describe('punctuationIndex', () => {
        test('should index tasks by punctuation type', async () => {
            const beliefTask = new Task(parseTerm('(cat --> animal)'), '.');
            const goalTask = new Task(parseTerm('find_food'), '!');
            const questionTask = new Task(parseTerm('(bird --> flies)'), '?');

            await memory.addTasks([beliefTask, goalTask, questionTask]);

            expect(memory.indexer.punctuationIndex.has('.')).toBe(true);
            expect(memory.indexer.punctuationIndex.has('!')).toBe(true);
            expect(memory.indexer.punctuationIndex.has('?')).toBe(true);

            expect(memory.indexer.punctuationIndex.get('.').has(beliefTask.id)).toBe(true);
            expect(memory.indexer.punctuationIndex.get('!').has(goalTask.id)).toBe(true);
            expect(memory.indexer.punctuationIndex.get('?').has(questionTask.id)).toBe(true);
        });

        test('should remove tasks from punctuation index when tasks are removed', () => {
            const beliefTask = new Task(parseTerm('(cat --> animal)'), '.');
            memory.addTasks([beliefTask]);

            expect(memory.indexer.punctuationIndex.get('.').has(beliefTask.id)).toBe(true);

            memory.removeTask(beliefTask.id);

            expect(memory.indexer.punctuationIndex.has('.') && memory.indexer.punctuationIndex.get('.').has(beliefTask.id)).toBe(false);
        });

        test('should query tasks by punctuation using index', async () => {
            const beliefTask1 = new Task(parseTerm('(cat --> animal)'), '.');
            const beliefTask2 = new Task(parseTerm('(bird --> animal)'), '.');
            const goalTask = new Task(parseTerm('find_food'), '!');

            await memory.addTasks([beliefTask1, beliefTask2, goalTask]);

            const beliefs = memory.queryTasks({
                punctuation: '.'
            });

            expect(beliefs).toHaveLength(2);
            expect(beliefs.every(task => task.punctuation === '.')).toBe(true);
            expect(beliefs.some(task => task.id === beliefTask1.id)).toBe(true);
            expect(beliefs.some(task => task.id === beliefTask2.id)).toBe(true);
        });
    });

    describe('priorityIndex', () => {
        test('should index tasks by priority buckets', async () => {
            const lowPriorityTask = new Task(parseTerm('(low_priority --> property)'), '.');
            lowPriorityTask.state.priority = 0.2;

            const highPriorityTask = new Task(parseTerm('(high_priority --> property)'), '.');
            highPriorityTask.state.priority = 0.8;

            await memory.addTasks([lowPriorityTask, highPriorityTask]);

            const lowPriorityBucket = Math.floor(lowPriorityTask.state.priority * 10);
            const highPriorityBucket = Math.floor(highPriorityTask.state.priority * 10);

            expect(memory.indexer.priorityIndex.has(lowPriorityBucket)).toBe(true);
            expect(memory.indexer.priorityIndex.has(highPriorityBucket)).toBe(true);

            expect(memory.indexer.priorityIndex.get(lowPriorityBucket).has(lowPriorityTask.id)).toBe(true);
            expect(memory.indexer.priorityIndex.get(highPriorityBucket).has(highPriorityTask.id)).toBe(true);
        });

        test('should remove tasks from priority index when tasks are removed', () => {
            const task = new Task(parseTerm('(test --> property)'), '.');
            task.state.priority = 0.5;
            memory.addTasks([task]);

            const priorityBucket = Math.floor(task.state.priority * 10);

            expect(memory.indexer.priorityIndex.get(priorityBucket).has(task.id)).toBe(true);

            memory.removeTask(task.id);

            expect(memory.indexer.priorityIndex.has(priorityBucket) && memory.indexer.priorityIndex.get(priorityBucket).has(task.id)).toBe(false);
        });
    });

    describe('queryTasks optimization', () => {
        test('should use punctuation index for faster queries', async () => {
            const tasks = [];
            for (let i = 0; i < 100; i++) {
                if (i % 2 === 0) {
                    tasks.push(new Task(parseTerm(`(belief_${i} --> property)`), '.'));
                } else {
                    tasks.push(new Task(parseTerm(`(goal_${i} --> property)`), '!'));
                }
            }

            await memory.addTasks(tasks);

            const beliefs = memory.queryTasks({
                punctuation: '.'
            });

            expect(beliefs.every(task => task.punctuation === '.')).toBe(true);
            expect(beliefs).toHaveLength(50);

            expect(memory.indexer.punctuationIndex.has('.')).toBe(true);
            expect(memory.indexer.punctuationIndex.get('.').size).toBe(50);
        });

        test('should fall back to full scan for complex queries', async () => {
            const task1 = new Task(parseTerm('(test --> property)'), '.');
            task1.state.priority = 0.9;
            task1.state.truthValue.confidence = 0.8;

            const task2 = new Task(parseTerm('(test2 --> property)'), '.');
            task2.state.priority = 0.3;
            task2.state.truthValue.confidence = 0.9;

            await memory.addTasks([task1, task2]);

            const results = memory.queryTasks({
                punctuation: '.',
                minPriority: 0.5,
                minConfidence: 0.7
            });

            expect(results).toHaveLength(1);
            expect(results[0].id).toBe(task1.id);
        });
    });
});
