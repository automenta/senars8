import {isBelief} from '../utils/task-utils.js';

class MemoryIndexer {
    constructor() {
        this.implicationIndex = new Map();
        this.beliefIndex = new Map();
        this.costIndex = new Map();
        this.punctuationIndex = new Map();
        this.priorityIndex = new Map();
    }

    indexTerm(term) {
        this._indexImplication(term);
    }

    indexTask(task) {
        this._indexBelief(task);
        this._updateCostIndex(task.term, 'add');
        this._indexPunctuation(task);
        this._indexPriority(task);
    }

    unindexTask(task) {
        this._unindexBelief(task);
        this._updateCostIndex(task.term, 'remove');
        this._unindexPunctuation(task);
        this._unindexPriority(task);
    }

    removeTerm(key) {
        this.implicationIndex.delete(key);
        this.beliefIndex.delete(key);
        this.costIndex.delete(key);
    }

    _indexImplication(term) {
        if (term.type !== 'Implication' || !term.subject) return;

        const goalTerm = (term.subject.type === 'SequentialConjunction' && term.subject.terms.length > 0) ?
            term.subject.terms[0] :
            term.subject;
        const goalKey = goalTerm.key;

        if (!this.implicationIndex.has(goalKey)) {
            this.implicationIndex.set(goalKey, []);
        }
        this.implicationIndex.get(goalKey).push(term);
    }

    _indexBelief(task) {
        if (!isBelief(task)) return;
        const key = task.termKey;
        if (!this.beliefIndex.has(key)) {
            this.beliefIndex.set(key, []);
        }
        this.beliefIndex.get(key).push(task);
    }

    _unindexBelief(task) {
        if (!isBelief(task) || !this.beliefIndex.has(task.termKey)) return;

        const beliefs = this.beliefIndex.get(task.termKey);
        const index = beliefs.indexOf(task);
        if (index !== -1) {
            // More efficient removal: swap with last element and pop (O(1) vs O(n) for splice)
            const lastIdx = beliefs.length - 1;
            if (index !== lastIdx) {
                beliefs[index] = beliefs[lastIdx];
            }
            beliefs.pop();
            if (beliefs.length === 0) {
                this.beliefIndex.delete(task.termKey);
            }
        }
    }

    _updateCostIndex(term, operation) {
        if (term?.type !== 'Inheritance' || !term.subject ||
            term.predicate?.type !== 'IntensionalSet' || term.predicate.terms.length !== 1) {
            return;
        }

        const cost = parseFloat(term.predicate.terms[0].key);
        if (isNaN(cost)) return;

        const actionKey = term.subject.key;
        if (operation === 'add') {
            this.costIndex.set(actionKey, cost);
        } else {
            this.costIndex.delete(actionKey);
        }
    }

    _updateSetIndex(index, key, id, operation) {
        if (!index.has(key)) {
            if (operation === 'remove') return;
            index.set(key, new Set());
        }
        const set = index.get(key);
        set[operation === 'add' ? 'add' : 'delete'](id);
        if (set.size === 0) {
            index.delete(key);
        }
    }

    _indexPunctuation(task) {
        this._updateSetIndex(this.punctuationIndex, task.punctuation, task.id, 'add');
    }

    _unindexPunctuation(task) {
        this._updateSetIndex(this.punctuationIndex, task.punctuation, task.id, 'remove');
    }

    _indexPriority(task) {
        const priorityBucket = Math.floor(task.state.priority * 10);
        this._updateSetIndex(this.priorityIndex, priorityBucket, task.id, 'add');
    }

    _unindexPriority(task) {
        const priorityBucket = Math.floor(task.state.priority * 10);
        this._updateSetIndex(this.priorityIndex, priorityBucket, task.id, 'remove');
    }

    clear() {
        this.implicationIndex.clear();
        this.beliefIndex.clear();
        this.costIndex.clear();
        this.punctuationIndex.clear();
        this.priorityIndex.clear();
    }

    getStatistics() {
        return {
            implications: this.implicationIndex.size,
            beliefs: this.beliefIndex.size,
            costs: this.costIndex.size,
        };
    }

    queryTasks(tasks, filters) {
        // If no filters, return sorted tasks
        if (!filters || Object.keys(filters).length === 0) {
            const result = new Array(tasks.length);
            for (let i = 0; i < tasks.length; i++) {
                result[i] = tasks[i];
            }
            return result.sort((a, b) => b.state.priority - a.state.priority);
        }

        let filteredTasks = tasks;

        // Apply punctuation filter first if available (most efficient)
        if (filters.punctuation) {
            const taskIds = this.punctuationIndex.get(filters.punctuation);
            if (!taskIds || taskIds.size === 0) return [];

            // More efficient approach: create task map and directly map IDs to tasks
            const taskMap = new Map();
            for (let i = 0; i < tasks.length; i++) {
                taskMap.set(tasks[i].id, tasks[i]);
            }

            const result = new Array(taskIds.size);
            let j = 0;
            for (const id of taskIds) {
                const task = taskMap.get(id);
                if (task) {
                    result[j++] = task;
                }
            }

            // Trim array to actual size
            filteredTasks = result.slice(0, j);
        }

        // Apply other filters sequentially using for loops for better performance
        if (filters.term) {
            const result = [];
            for (let i = 0; i < filteredTasks.length; i++) {
                if (filteredTasks[i].term.key.includes(filters.term)) {
                    result.push(filteredTasks[i]);
                }
            }
            filteredTasks = result;
        }

        if (filters.termKey) {
            const result = [];
            for (let i = 0; i < filteredTasks.length; i++) {
                if (filteredTasks[i].termKey === filters.termKey) {
                    result.push(filteredTasks[i]);
                }
            }
            filteredTasks = result;
        }

        if (filters.minPriority !== undefined) {
            const result = [];
            for (let i = 0; i < filteredTasks.length; i++) {
                if (filteredTasks[i].state.priority >= filters.minPriority) {
                    result.push(filteredTasks[i]);
                }
            }
            filteredTasks = result;
        }

        if (filters.minConfidence !== undefined) {
            const result = [];
            for (let i = 0; i < filteredTasks.length; i++) {
                if (filteredTasks[i].state.truthValue.confidence >= filters.minConfidence) {
                    result.push(filteredTasks[i]);
                }
            }
            filteredTasks = result;
        }

        // Sort and limit
        filteredTasks.sort((a, b) => b.state.priority - a.state.priority);

        return filters.limit ? filteredTasks.slice(0, filters.limit) : filteredTasks;
    }

    clone() {
        const newIndexer = new MemoryIndexer();

        // Efficiently copy maps and their contents
        newIndexer.implicationIndex = new Map();
        for (const [key, value] of this.implicationIndex) {
            newIndexer.implicationIndex.set(key, Array.from(value));
        }

        newIndexer.beliefIndex = new Map();
        for (const [key, value] of this.beliefIndex) {
            newIndexer.beliefIndex.set(key, Array.from(value));
        }

        newIndexer.costIndex = new Map(this.costIndex);

        newIndexer.punctuationIndex = new Map();
        for (const [key, value] of this.punctuationIndex) {
            newIndexer.punctuationIndex.set(key, new Set(value));
        }

        newIndexer.priorityIndex = new Map();
        for (const [key, value] of this.priorityIndex) {
            newIndexer.priorityIndex.set(key, new Set(value));
        }

        return newIndexer;
    }
}

export default MemoryIndexer;
