import {isBelief} from '../utils/task-utils.js';
import {MinPriorityQueue} from '@datastructures-js/priority-queue';

function consolidateMemory(shortTermTasks, longTermTasks, config) {
    const priorityThreshold = config.memory.CONSOLIDATION_PRIORITY_THRESHOLD;
    const confidenceThreshold = config.memory.CONSOLIDATION_CONFIDENCE_THRESHOLD;

    const tasksToMove = [];
    for (const [taskId, task] of shortTermTasks.entries()) {
        if (task.state.priority >= priorityThreshold || task.state.truthValue.confidence >= confidenceThreshold) {
            tasksToMove.push([taskId, task]);
        }
    }

    const newShortTermTasks = new Map(shortTermTasks);
    const newLongTermTasks = new Map(longTermTasks);

    for (const [taskId, task] of tasksToMove) {
        newLongTermTasks.set(taskId, task);
        newShortTermTasks.delete(taskId);
    }

    return {
        shortTermTasks: newShortTermTasks,
        longTermTasks: newLongTermTasks
    };
}

function updateCostIndex(term, costIndex, operation) {
    if (!term || term.type !== 'Inheritance' || !term.subject ||
        term.predicate?.type !== 'IntensionalSet' || term.predicate.terms.length !== 1) {
        return costIndex;
    }

    const cost = parseFloat(term.predicate.terms[0].key);
    if (isNaN(cost)) {
        return costIndex;
    }

    const actionKey = term.subject.key;
    const newCostIndex = new Map(costIndex);

    operation === 'add' ? newCostIndex.set(actionKey, cost) : newCostIndex.delete(actionKey);

    return newCostIndex;
}

function indexImplication(term, implicationIndex) {
    if (term.type !== 'Implication' || !term.subject) {
        return implicationIndex;
    }

    const goalTerm = (term.subject.type === 'SequentialConjunction' && term.subject.terms.length > 0) ?
        term.subject.terms[0] :
        term.subject;
    const goalKey = goalTerm.key;

    const newImplicationIndex = new Map(implicationIndex);
    if (!newImplicationIndex.has(goalKey)) {
        newImplicationIndex.set(goalKey, []);
    }

    const currentImplications = newImplicationIndex.get(goalKey) || [];
    newImplicationIndex.set(goalKey, [...currentImplications, term]);

    return newImplicationIndex;
}

function indexTask(task, beliefIndex) {
    if (!isBelief(task)) {
        return beliefIndex;
    }

    const newBeliefIndex = new Map(beliefIndex);
    const currentBeliefs = newBeliefIndex.get(task.termKey) || [];
    newBeliefIndex.set(task.termKey, [...currentBeliefs, task]);

    return newBeliefIndex;
}

function unindexTask(task, beliefIndex) {
    if (!isBelief(task) || !beliefIndex.has(task.termKey)) {
        return beliefIndex;
    }

    const newBeliefIndex = new Map(beliefIndex);
    const beliefs = [...newBeliefIndex.get(task.termKey)];
    const index = beliefs.indexOf(task);

    if (index !== -1) {
        beliefs.splice(index, 1);
        beliefs.length === 0 ? newBeliefIndex.delete(task.termKey) : newBeliefIndex.set(task.termKey, beliefs);
    }

    return newBeliefIndex;
}

function getHighestPriorityTasksWithPQ(tasks, k) {
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
