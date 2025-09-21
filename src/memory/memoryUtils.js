import { isBelief } from '../utils/index.js';
import {MinPriorityQueue} from '@datastructures-js/priority-queue';

function consolidateMemory(shortTermTasks, longTermTasks, config) {
    const {
        CONSOLIDATION_PRIORITY_THRESHOLD: priorityThreshold,
        CONSOLIDATION_CONFIDENCE_THRESHOLD: confidenceThreshold
    } = config.memory;

    const newShortTermTasks = new Map();
    const newLongTermTasks = new Map(longTermTasks);

    for (const [taskId, task] of shortTermTasks.entries()) {
        if (task.state.priority >= priorityThreshold || task.state.truthValue.confidence >= confidenceThreshold) {
            newLongTermTasks.set(taskId, task);
        } else {
            newShortTermTasks.set(taskId, task);
        }
    }

    return {
        shortTermTasks: newShortTermTasks,
        longTermTasks: newLongTermTasks
    };
}

function updateCostIndex(term, costIndex, operation) {
    if (term?.type !== 'Inheritance' || !term.subject ||
        term.predicate?.type !== 'IntensionalSet' || term.predicate.terms.length !== 1) {
        return costIndex;
    }

    const cost = parseFloat(term.predicate.terms[0].key);
    if (isNaN(cost)) return costIndex;

    const actionKey = term.subject.key;
    const newCostIndex = new Map(costIndex);
    operation === 'add' ? newCostIndex.set(actionKey, cost) : newCostIndex.delete(actionKey);
    return newCostIndex;
}

function indexImplication(term, implicationIndex) {
    if (term.type !== 'Implication' || !term.subject) return implicationIndex;

    const goalTerm = (term.subject.type === 'SequentialConjunction' && term.subject.terms.length > 0) ?
        term.subject.terms[0] :
        term.subject;
    const goalKey = goalTerm.key;

    const newImplicationIndex = new Map(implicationIndex);
    if (!newImplicationIndex.has(goalKey)) {
        newImplicationIndex.set(goalKey, []);
    }
    newImplicationIndex.get(goalKey).push(term);
    return newImplicationIndex;
}

function indexTask(task, beliefIndex) {
    if (!isBelief(task)) return beliefIndex;
    const newBeliefIndex = new Map(beliefIndex);
    const beliefs = newBeliefIndex.get(task.termKey) || [];
    newBeliefIndex.set(task.termKey, [...beliefs, task]);
    return newBeliefIndex;
}

function unindexTask(task, beliefIndex) {
    if (!isBelief(task) || !beliefIndex.has(task.termKey)) return beliefIndex;

    const newBeliefIndex = new Map(beliefIndex);
    const beliefs = newBeliefIndex.get(task.termKey).filter(t => t !== task);

    if (beliefs.length > 0) {
        newBeliefIndex.set(task.termKey, beliefs);
    } else {
        newBeliefIndex.delete(task.termKey);
    }
    return newBeliefIndex;
}

function getHighestPriorityTasksWithPQ(tasks, k) {
    if (k <= 0) return [];
    const pq = new MinPriorityQueue({
        priority: task => task.state.priority
    });
    for (const task of tasks) {
        if (pq.size() < k) {
            pq.enqueue(task);
        } else if (task.state.priority > pq.front().priority) {
            pq.dequeue();
            pq.enqueue(task);
        }
    }
    return pq.toArray().map(item => item.element).sort((a, b) => b.state.priority - a.state.priority);
}

export {
    consolidateMemory,
    updateCostIndex,
    indexImplication,
    indexTask,
    unindexTask,
    getHighestPriorityTasksWithPQ
};
