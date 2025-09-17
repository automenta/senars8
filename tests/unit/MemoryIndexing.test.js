import MemoryIndexer from '../../src/memory/MemoryIndexer.js';
import Task from '../../src/core/Task.js';
import Term from '../../src/core/Term.js';
import {parseTerm} from '../../src/parser/narseseParser.js';

describe('MemoryIndexer', () => {
    let indexer;

    beforeEach(() => {
        indexer = new MemoryIndexer();
    });

    test('should index implication terms correctly', () => {
        const term = new Term('(goal ==> action)');
        term.type = 'Implication';
        term.subject = {
            key: 'goal',
            type: 'Atomic'
        };
        term.predicate = {
            key: 'action',
            type: 'Atomic'
        };
        indexer.indexTerm(term);
        expect(indexer.implicationIndex.has('goal')).toBe(true);
        expect(indexer.implicationIndex.get('goal')).toContain(term);
    });

    test('should index belief tasks correctly', () => {
        const task = new Task(parseTerm('belief'), '.');
        indexer.indexTask(task);
        expect(indexer.beliefIndex.has('belief')).toBe(true);
        expect(indexer.beliefIndex.get('belief')).toContain(task);
    });

    test('should index and unindex tasks by punctuation', () => {
        const task = new Task(parseTerm('belief'), '.');
        indexer._indexPunctuation(task);
        expect(indexer.punctuationIndex.get('.').has(task.id)).toBe(true);
        indexer._unindexPunctuation(task);
        expect(indexer.punctuationIndex.has('.')).toBe(false);
    });

    test('should index and unindex tasks by priority', () => {
        const task = new Task(parseTerm('belief'), '.');
        task.state.priority = 0.75;
        const bucket = 7;
        indexer._indexPriority(task);
        expect(indexer.priorityIndex.get(bucket).has(task.id)).toBe(true);
        indexer._unindexPriority(task);
        expect(indexer.priorityIndex.has(bucket)).toBe(false);
    });

    test('should correctly query tasks by punctuation', () => {
        const belief = new Task(parseTerm('a'), '.');
        const goal = new Task(parseTerm('b'), '!');
        const tasks = [belief, goal];
        indexer.indexTask(belief);
        indexer.indexTask(goal);

        const beliefs = indexer.queryTasks(tasks, {
            punctuation: '.'
        });
        expect(beliefs).toHaveLength(1);
        expect(beliefs[0].termKey).toBe('a');

        const goals = indexer.queryTasks(tasks, {
            punctuation: '!'
        });
        expect(goals).toHaveLength(1);
        expect(goals[0].termKey).toBe('b');
    });

    test('should clone the indexer correctly', () => {
        const term = new Term('(goal ==> action)');
        term.type = 'Implication';
        term.subject = {
            key: 'goal',
            type: 'Atomic'
        };
        term.predicate = {
            key: 'action',
            type: 'Atomic'
        };
        indexer.indexTerm(term);
        const task = new Task(parseTerm('belief'), '.');
        indexer.indexTask(task);

        const clonedIndexer = indexer.clone();
        expect(clonedIndexer.implicationIndex.size).toBe(1);
        expect(clonedIndexer.beliefIndex.size).toBe(1);
        expect(clonedIndexer.punctuationIndex.size).toBe(1);
        expect(clonedIndexer.priorityIndex.size).toBe(1);
    });
});
