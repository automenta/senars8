import {
    isBelief
} from '../utils/task-utils.js';

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
        if (term.type !== 'Implication' || !term.subject) {
            return;
        }

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
        if (!isBelief(task)) {
            return;
        }
        if (!this.beliefIndex.has(task.termKey)) {
            this.beliefIndex.set(task.termKey, []);
        }
        this.beliefIndex.get(task.termKey).push(task);
    }

    _unindexBelief(task) {
        if (!isBelief(task) || !this.beliefIndex.has(task.termKey)) {
            return;
        }

        const beliefs = this.beliefIndex.get(task.termKey);
        const index = beliefs.indexOf(task);

        if (index !== -1) {
            beliefs.splice(index, 1);
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
        if (isNaN(cost)) {
            return;
        }

        const actionKey = term.subject.key;
        if (operation === 'add') {
            this.costIndex.set(actionKey, cost);
        } else {
            this.costIndex.delete(actionKey);
        }
    }

    _indexPunctuation(task) {
        if (!this.punctuationIndex.has(task.punctuation)) {
            this.punctuationIndex.set(task.punctuation, new Set());
        }
        this.punctuationIndex.get(task.punctuation).add(task.id);
    }

    _unindexPunctuation(task) {
        if (this.punctuationIndex.has(task.punctuation)) {
            const taskIds = this.punctuationIndex.get(task.punctuation);
            taskIds.delete(task.id);
            if (taskIds.size === 0) {
                this.punctuationIndex.delete(task.punctuation);
            }
        }
    }

    _indexPriority(task) {
        const priorityBucket = Math.floor(task.state.priority * 10);
        if (!this.priorityIndex.has(priorityBucket)) {
            this.priorityIndex.set(priorityBucket, new Set());
        }
        this.priorityIndex.get(priorityBucket).add(task.id);
    }

    _unindexPriority(task) {
        const priorityBucket = Math.floor(task.state.priority * 10);
        if (this.priorityIndex.has(priorityBucket)) {
            const taskIds = this.priorityIndex.get(priorityBucket);
            taskIds.delete(task.id);
            if (taskIds.size === 0) {
                this.priorityIndex.delete(priorityBucket);
            }
        }
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
        let filteredTasks;
        if (filters.punctuation) {
            if (!['.', '!', '?'].includes(filters.punctuation)) {
                return [];
            }
            const taskIds = this.punctuationIndex.get(filters.punctuation);
            if (!taskIds) {
                return [];
            }
            const taskMap = new Map(tasks.map(t => [t.id, t]));
            filteredTasks = Array.from(taskIds).map(id => taskMap.get(id)).filter(Boolean);
        } else {
            filteredTasks = [...tasks];
        }

        if (filters.termKey) {
            filteredTasks = filteredTasks.filter(task => task.termKey === filters.termKey);
        }
        if (filters.minPriority !== undefined) {
            filteredTasks = filteredTasks.filter(task => task.state.priority >= filters.minPriority);
        }
        if (filters.minConfidence !== undefined) {
            filteredTasks = filteredTasks.filter(task => task.state.truthValue.confidence >= filters.minConfidence);
        }

        filteredTasks.sort((a, b) => b.state.priority - a.state.priority);

        if (filters.limit !== undefined) {
            return filteredTasks.slice(0, filters.limit);
        }

        return filteredTasks;
    }

    clone() {
        const newIndexer = new MemoryIndexer();
        newIndexer.implicationIndex = new Map(this.implicationIndex);
        newIndexer.beliefIndex = new Map(Array.from(this.beliefIndex.entries()).map(([key, value]) => [key, [...value]]));
        newIndexer.costIndex = new Map(this.costIndex);
        newIndexer.punctuationIndex = new Map(Array.from(this.punctuationIndex.entries()).map(([key, value]) => [key, new Set(value)]));
        newIndexer.priorityIndex = new Map(Array.from(this.priorityIndex.entries()).map(([key, value]) => [key, new Set(value)]));
        return newIndexer;
    }
}

export default MemoryIndexer;
