import Memory from '../../src/memory/Memory.js';
import Task from '../../src/core/Task.js';
import {parseTerm} from '../../src/parser/narseseParser.js';

describe('Memory Indexing', () => {
    let memory;

    beforeEach(() => {
        memory = new Memory();
    });

    describe('punctuationIndex', () => {
        test('should index tasks by punctuation type', async () => {
            const beliefTask = new Task(parseTerm('(cat --> animal)'), '.');
            const goalTask = new Task(parseTerm('find_food'), '!');
            const questionTask = new Task(parseTerm('(bird --> flies)'), '?');
            
            await memory.addTasks([beliefTask, goalTask, questionTask]);
            
            // Check that tasks are indexed by punctuation
            expect(memory.punctuationIndex.has('.')).toBe(true);
            expect(memory.punctuationIndex.has('!')).toBe(true);
            expect(memory.punctuationIndex.has('?')).toBe(true);
            
            // Check that the index contains the correct task IDs
            expect(memory.punctuationIndex.get('.').has(beliefTask.id)).toBe(true);
            expect(memory.punctuationIndex.get('!').has(goalTask.id)).toBe(true);
            expect(memory.punctuationIndex.get('?').has(questionTask.id)).toBe(true);
        });

        test('should remove tasks from punctuation index when tasks are removed', () => {
            const beliefTask = new Task(parseTerm('(cat --> animal)'), '.');
            memory.addTasks([beliefTask]);
            
            // Verify task is in index
            expect(memory.punctuationIndex.get('.').has(beliefTask.id)).toBe(true);
            
            // Remove task
            memory.removeTask(beliefTask.id);
            
            // Verify task is removed from index
            // If this was the last task with this punctuation, the entry should be removed
            expect(memory.punctuationIndex.has('.') && memory.punctuationIndex.get('.').has(beliefTask.id)).toBe(false);
        });

        test('should query tasks by punctuation using index', async () => {
            const beliefTask1 = new Task(parseTerm('(cat --> animal)'), '.');
            const beliefTask2 = new Task(parseTerm('(bird --> animal)'), '.');
            const goalTask = new Task(parseTerm('find_food'), '!');
            
            await memory.addTasks([beliefTask1, beliefTask2, goalTask]);
            
            // Query beliefs using the index
            const beliefs = memory.queryTasks({punctuation: '.'});
            
            // Should return only belief tasks
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
            
            // Check that tasks are indexed by priority buckets
            const lowPriorityBucket = Math.floor(lowPriorityTask.state.priority * 10);
            const highPriorityBucket = Math.floor(highPriorityTask.state.priority * 10);
            
            expect(memory.priorityIndex.has(lowPriorityBucket)).toBe(true);
            expect(memory.priorityIndex.has(highPriorityBucket)).toBe(true);
            
            // Check that the index contains the correct task IDs
            expect(memory.priorityIndex.get(lowPriorityBucket).has(lowPriorityTask.id)).toBe(true);
            expect(memory.priorityIndex.get(highPriorityBucket).has(highPriorityTask.id)).toBe(true);
        });

        test('should remove tasks from priority index when tasks are removed', () => {
            const task = new Task(parseTerm('(test --> property)'), '.');
            task.state.priority = 0.5;
            memory.addTasks([task]);
            
            const priorityBucket = Math.floor(task.state.priority * 10);
            
            // Verify task is in index
            expect(memory.priorityIndex.get(priorityBucket).has(task.id)).toBe(true);
            
            // Remove task
            memory.removeTask(task.id);
            
            // Verify task is removed from index
            // If this was the last task in this bucket, the entry should be removed
            expect(memory.priorityIndex.has(priorityBucket) && memory.priorityIndex.get(priorityBucket).has(task.id)).toBe(false);
        });
    });

    describe('queryTasks optimization', () => {
        test('should use punctuation index for faster queries', async () => {
            // Create many tasks to demonstrate performance difference
            const tasks = [];
            for (let i = 0; i < 100; i++) {
                if (i % 2 === 0) {
                    tasks.push(new Task(parseTerm(`(belief_${i} --> property)`), '.'));
                } else {
                    tasks.push(new Task(parseTerm(`(goal_${i} --> property)`), '!'));
                }
            }
            
            await memory.addTasks(tasks);
            
            // Query beliefs - should use index
            const startTime = Date.now();
            const beliefs = memory.queryTasks({punctuation: '.'});
            const endTime = Date.now();
            
            // Should return only belief tasks
            expect(beliefs.every(task => task.punctuation === '.')).toBe(true);
            expect(beliefs).toHaveLength(50);
            
            // Verify the index was used (this is more of a structural test)
            expect(memory.punctuationIndex.has('.')).toBe(true);
            expect(memory.punctuationIndex.get('.').size).toBe(50);
        });

        test('should fall back to full scan for complex queries', async () => {
            const task1 = new Task(parseTerm('(test --> property)'), '.');
            task1.state.priority = 0.9;
            task1.state.truthValue.confidence = 0.8;
            
            const task2 = new Task(parseTerm('(test2 --> property)'), '.');
            task2.state.priority = 0.3;
            task2.state.truthValue.confidence = 0.9;
            
            await memory.addTasks([task1, task2]);
            
            // Query with multiple filters - should fall back to full scan
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