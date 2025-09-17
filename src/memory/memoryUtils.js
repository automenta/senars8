import {isBelief} from '../utils/task-utils.js';
import {MinPriorityQueue} from '@datastructures-js/priority-queue';

/**
 * Memory utilities for task and term management
 */

/**
 * Consolidates memory by moving high priority/confidence tasks to long term storage
 * @param {Map} shortTermTasks - Short term task map
 * @param {Map} longTermTasks - Long term task map
 * @param {object} config - Memory configuration
 * @returns {object} Updated task maps
 */
function consolidateMemory(shortTermTasks, longTermTasks, config) {
    const priorityThreshold = config.memory.CONSOLIDATION_PRIORITY_THRESHOLD;
    const confidenceThreshold = config.memory.CONSOLIDATION_CONFIDENCE_THRESHOLD;

    const tasksToMove = [];
    for (const [taskId, task] of shortTermTasks.entries()) {
        if (task.state.priority >= priorityThreshold || task.state.truthValue.confidence >= confidenceThreshold) {
            tasksToMove.push([taskId, task]);
        }
    }

    // Create new maps to avoid mutating the originals
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

/**
 * Updates cost index based on term structure
 * @param {Term} term - Term to process
 * @param {Map} costIndex - Cost index map
 * @param {string} operation - Operation type ('add' or 'remove')
 * @returns {Map} Updated cost index
 */
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

/**
 * Indexes implications for a term
 * @param {Term} term - Term to index
 * @param {Map} implicationIndex - Current implication index
 * @returns {Map} Updated implication index
 */
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

/**
 * Indexes a task for belief queries
 * @param {Task} task - Task to index
 * @param {Map} beliefIndex - Current belief index
 * @returns {Map} Updated belief index
 */
function indexTask(task, beliefIndex) {
    if (!isBelief(task)) {
        return beliefIndex;
    }

    const newBeliefIndex = new Map(beliefIndex);
    const currentBeliefs = newBeliefIndex.get(task.termKey) || [];
    newBeliefIndex.set(task.termKey, [...currentBeliefs, task]);

    return newBeliefIndex;
}

/**
 * Unindexes a task from belief queries
 * @param {Task} task - Task to unindex
 * @param {Map} beliefIndex - Current belief index
 * @returns {Map} Updated belief index
 */
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

/**
 * Gets highest priority tasks using priority queue for efficiency
 * @param {Array} tasks - Array of tasks
 * @param {number} k - Number of tasks to return
 * @returns {Array} Highest priority tasks
 */
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
