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
        // If no filters, return sorted tasks with optimized sorting
        if (!filters || Object.keys(filters).length === 0) {
            return this._sortTasksByPriority(tasks);
        }

        let filteredTasks = tasks;

        // Apply punctuation filter first if available (most efficient)
        if (filters.punctuation) {
            filteredTasks = this._filterByPunctuation(filteredTasks, filters.punctuation);
            if (filteredTasks.length === 0) return [];
        }

        // Apply other filters with early termination and optimized loops
        filteredTasks = this._applyAdvancedFilters(filteredTasks, filters);

        // Sort and limit with optimized approach
        return this._finalizeQueryResults(filteredTasks, filters);
    }

    _sortTasksByPriority(tasks) {
        if (tasks.length <= 1) return tasks;

        // Use more efficient sorting for large arrays
        return tasks.length > 1000
            ? this._mergeSortByPriority(tasks)
            : [...tasks].sort((a, b) => b.state.priority - a.state.priority);
    }

    _mergeSortByPriority(tasks) {
        if (tasks.length <= 1) return tasks;

        const mid = Math.floor(tasks.length / 2);
        const left = this._mergeSortByPriority(tasks.slice(0, mid));
        const right = this._mergeSortByPriority(tasks.slice(mid));

        return this._merge(left, right);
    }

    _merge(left, right) {
        const result = [];
        let leftIndex = 0;
        let rightIndex = 0;

        while (leftIndex < left.length && rightIndex < right.length) {
            if (left[leftIndex].state.priority >= right[rightIndex].state.priority) {
                result.push(left[leftIndex++]);
            } else {
                result.push(right[rightIndex++]);
            }
        }

        return result.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
    }

    _filterByPunctuation(tasks, punctuation) {
        const taskIds = this.punctuationIndex.get(punctuation);
        if (!taskIds || taskIds.size === 0) return [];

        // Pre-create task map for O(1) lookups
        const taskMap = new Map();
        for (const task of tasks) {
            taskMap.set(task.id, task);
        }

        const result = [];
        for (const id of taskIds) {
            const task = taskMap.get(id);
            if (task) result.push(task);
        }

        return result;
    }

    _applyAdvancedFilters(tasks, filters) {
        let filteredTasks = tasks;

        // Combine filters for better performance when multiple filters are applied
        if (filters.term || filters.termKey || filters.minPriority !== undefined || filters.minConfidence !== undefined) {
            const result = [];

            for (const task of filteredTasks) {
                if (this._taskMatchesFilters(task, filters)) {
                    result.push(task);
                }
            }

            filteredTasks = result;
        }

        return filteredTasks;
    }

    _taskMatchesFilters(task, filters) {
        // Term filter (substring search)
        if (filters.term && !task.term.key.includes(filters.term)) {
            return false;
        }

        // Term key filter (exact match)
        if (filters.termKey && task.termKey !== filters.termKey) {
            return false;
        }

        // Priority filter
        if (filters.minPriority !== undefined && task.state.priority < filters.minPriority) {
            return false;
        }

        // Confidence filter
        if (filters.minConfidence !== undefined && task.state.truthValue.confidence < filters.minConfidence) {
            return false;
        }

        return true;
    }

    _finalizeQueryResults(tasks, filters) {
        // Sort by priority (descending)
        const sortedTasks = this._sortTasksByPriority(tasks);

        // Apply limit if specified
        return filters.limit ? sortedTasks.slice(0, filters.limit) : sortedTasks;
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
