import Term from '../core/Term.js';
import Task from '../core/Task.js';
import EventBus from '../system/EventBus.js';
import config from '../config/index.js';
import {normalizeToArray} from '../utils/helpers.js';
import {
    consolidateMemory,
    getHighestPriorityTasksWithPQ,
    indexImplication,
    indexTask,
    unindexTask,
    updateCostIndex
} from './memoryUtils.js';
import TimeBasedForgettingStrategy from './strategies/TimeBasedForgettingStrategy.js';

/**
 * Memory manages the knowledge graph, storing Terms and Tasks.
 * It maintains both short-term and long-term memory, handles indexing,
 * and implements forgetting strategies.
 *
 * The Memory class is responsible for:
 * 1. Storing and retrieving Terms and Tasks
 * 2. Managing short-term and long-term memory separation
 * 3. Indexing tasks for efficient querying
 * 4. Implementing forgetting strategies to manage memory usage
 * 5. Performing periodic maintenance operations
 */
class Memory {
    /**
     * Creates a new Memory instance.
     */
    constructor() {
        // Core data structures
        this.terms = new Map(); // Term key -> Term
        this.shortTermTasks = new Map(); // Task ID -> Task (recently accessed)
        this.longTermTasks = new Map(); // Task ID -> Task (persisted)

        // Indexes for efficient querying
        this.implicationIndex = new Map(); // Term key -> Set of implication terms
        this.beliefIndex = new Map(); // Term key -> Set of belief tasks
        this.costIndex = new Map(); // Term key -> cost information
        this.punctuationIndex = new Map(); // Punctuation type -> Set of task IDs
        this.priorityIndex = new Map(); // Priority bucket -> Set of task IDs

        // Maintenance state
        this.cycleCounter = 0;
        this.maintenanceFrequency = config.memory.MAINTENANCE_CYCLE_FREQUENCY;
        this._cachedAllTasks = null;

        this._loadForgettingStrategy();
        this._registerEventListeners();
    }

    /**
     * Gets the names of methods that can be forwarded to this memory instance
     * @returns {string[]} Array of method names
     */
    static getForwardableMethods() {
        return [
            'getMemoryStatistics', 'findTasksByTermKey', 'getHighPriorityTasks',
            'getTask', 'getTerm', 'getAllTasks', 'getAllTerms', 'getBeliefs',
            'getGoals', 'getQuestions', 'getTopPriorityTasks', 'getRecentTasks',
            'queryTasks', 'removeTask', 'exportState', 'importState'
        ];
    }

    /**
     * Loads the configured forgetting strategy
     * @private
     */
    _loadForgettingStrategy() {
        const strategyName = config.memory.FORGETTING_STRATEGY_NAME;
        // For now, we only support TimeBased, so we load it directly.
        // This can be extended to support more strategies in the future.
        if (strategyName === 'TimeBased') {
            this.forgettingStrategy = new TimeBasedForgettingStrategy();
        } else {
            this.forgettingStrategy = new TimeBasedForgettingStrategy();
        }
    }

    /**
     * Registers event listeners for memory management
     * @private
     */
    _registerEventListeners() {
        EventBus.on('NewTasksCreated', tasks => this.addTasks(tasks));
        EventBus.on('SystemCycleEnded', () => this._performMaintenanceIfNeeded());
    }

    /**
     * Performs maintenance operations if needed based on cycle counter
     * @private
     */
    _performMaintenanceIfNeeded() {
        this.cycleCounter++;
        if (this.cycleCounter % this.maintenanceFrequency === 0) {
            this._consolidateMemory();
            this._pruneMemory();
        }
    }

    /**
     * Consolidates memory by moving tasks between short-term and long-term storage
     * @private
     */
    _consolidateMemory() {
        const result = consolidateMemory(this.shortTermTasks, this.longTermTasks, config);
        this.shortTermTasks = result.shortTermTasks;
        this.longTermTasks = result.longTermTasks;
        this._invalidateTaskCache();
    }

    /**
     * Prunes memory using the configured forgetting strategy
     * @private
     */
    _pruneMemory() {
        if (!this.forgettingStrategy) {
            return;
        }

        const options = config.memory.FORGETTING_STRATEGY_OPTIONS || {};
        this.shortTermTasks = this.forgettingStrategy.prune(this.shortTermTasks, options.shortTerm);
        this.longTermTasks = this.forgettingStrategy.prune(this.longTermTasks, options.longTerm);
        this._invalidateTaskCache();
    }

    /**
     * Invalidates the cached all tasks array
     * @private
     */
    _invalidateTaskCache() {
        this._cachedAllTasks = null;
    }

    /**
     * Indexes implications for a term
     * @param {Term} term - The term to index implications for
     * @private
     */
    _indexImplication(term) {
        this.implicationIndex = indexImplication(term, this.implicationIndex);
    }

    /**
     * Adds a term to memory
     * @param {Term} term - The term to add
     * @throws {Error} If the term is invalid or not a Term instance
     */
    addTerm(term) {
        if (!term || !(term instanceof Term)) {
            throw new Error('Can only add valid Term instances to memory.');
        }
        if (this.terms.has(term.key)) {
            return;
        }

        this.terms.set(term.key, term);
        this._indexImplication(term);
    }

    /**
     * Gets a term by key
     * @param {string} key - The term key
     * @returns {Term|null} The term or null if not found
     */
    getTerm(key) {
        return this.terms.get(key);
    }

    /**
     * Gets all terms in memory
     * @returns {Term[]} Array of all terms
     */
    getAllTerms() {
        return Array.from(this.terms.values());
    }

    /**
     * Indexes a task for efficient querying
     * @param {Task} task - The task to index
     * @private
     */
    _indexTask(task) {
        this.beliefIndex = indexTask(task, this.beliefIndex);
        this.costIndex = updateCostIndex(task.term, this.costIndex, 'add');

        // Update punctuation index
        if (!this.punctuationIndex.has(task.punctuation)) {
            this.punctuationIndex.set(task.punctuation, new Set());
        }
        this.punctuationIndex.get(task.punctuation).add(task.id);

        // Update priority index (simple implementation - could be more sophisticated)
        const priorityBucket = Math.floor(task.state.priority * 10); // 0-10 buckets
        if (!this.priorityIndex.has(priorityBucket)) {
            this.priorityIndex.set(priorityBucket, new Set());
        }
        this.priorityIndex.get(priorityBucket).add(task.id);
    }

    /**
     * Removes a task from indexes
     * @param {Task} task - The task to unindex
     * @private
     */
    _unindexTask(task) {
        this.beliefIndex = unindexTask(task, this.beliefIndex);
        this.costIndex = updateCostIndex(task.term, this.costIndex, 'remove');

        // Update punctuation index
        if (this.punctuationIndex.has(task.punctuation)) {
            this.punctuationIndex.get(task.punctuation).delete(task.id);
            if (this.punctuationIndex.get(task.punctuation).size === 0) {
                this.punctuationIndex.delete(task.punctuation);
            }
        }

        // Update priority index
        const priorityBucket = Math.floor(task.state.priority * 10);
        if (this.priorityIndex.has(priorityBucket)) {
            this.priorityIndex.get(priorityBucket).delete(task.id);
            if (this.priorityIndex.get(priorityBucket).size === 0) {
                this.priorityIndex.delete(priorityBucket);
            }
        }
    }

    /**
     * Adds tasks to memory
     * @param {Task|Task[]} tasks - The task or array of tasks to add
     * @throws {Error} If any task is invalid or not a Task instance
     */
    addTasks(tasks) {
        const tasksToAdd = normalizeToArray(tasks);
        if (tasksToAdd.length === 0) {
            return;
        }

        for (const task of tasksToAdd) {
            if (!task || !(task instanceof Task)) {
                throw new Error('Can only add valid Task instances to memory.');
            }
            this.shortTermTasks.set(task.id, task);
            this._indexTask(task);
        }

        this._invalidateTaskCache();
    }

    /**
     * Gets a task by ID
     * @param {string} id - The task ID
     * @returns {Task|null} The task or null if not found
     */
    getTask(id) {
        return this.shortTermTasks.get(id) || this.longTermTasks.get(id);
    }

    /**
     * Removes a task from memory
     * @param {string} taskId - The ID of the task to remove
     */
    removeTask(taskId) {
        if (!taskId) {
            return;
        }

        const task = this.getTask(taskId);
        if (task) {
            this.shortTermTasks.delete(taskId);
            this.longTermTasks.delete(taskId);
            this._unindexTask(task);
            this._invalidateTaskCache();
        }
    }

    /**
     * Gets all tasks in memory
     * @returns {Task[]} Array of all tasks
     */
    getAllTasks() {
        if (!this._cachedAllTasks) {
            this._cachedAllTasks = [...this.shortTermTasks.values(), ...this.longTermTasks.values()];
        }
        return this._cachedAllTasks;
    }

    /**
     * Determines whether to use a priority queue for getting highest priority tasks
     * @param {number} k - Number of tasks to retrieve
     * @param {number} totalTasks - Total number of tasks
     * @returns {boolean} True if priority queue should be used
     * @private
     */
    _shouldUsePriorityQueue(k, totalTasks) {
        const K_THRESHOLD = 50;
        const RATIO_THRESHOLD = 10;
        return k < K_THRESHOLD && k < totalTasks / RATIO_THRESHOLD;
    }

    /**
     * Gets the highest priority tasks
     * @param {number} [k=20] - The number of tasks to retrieve
     * @returns {Task[]} Array of highest priority tasks
     */
    getHighestPriorityTasks(k = 20) {
        if (k <= 0) {
            return [];
        }

        const allTasks = this.getAllTasks();
        if (this._shouldUsePriorityQueue(k, allTasks.length)) {
            return getHighestPriorityTasksWithPQ(allTasks, k);
        }
        return [...allTasks].sort((a, b) => b.state.priority - a.state.priority).slice(0, k);
    }

    /**
     * Creates a deep copy of this memory instance
     * @returns {Memory} A new memory instance with the same data
     */
    clone() {
        const newMemory = new Memory();
        newMemory.terms = new Map(this.terms);
        newMemory.shortTermTasks = new Map(this.shortTermTasks);
        newMemory.longTermTasks = new Map(this.longTermTasks);
        newMemory.implicationIndex = new Map(this.implicationIndex);
        newMemory.beliefIndex = new Map(Array.from(this.beliefIndex.entries()).map(([key, value]) => [key, [...value]]));
        newMemory.costIndex = new Map(this.costIndex);
        newMemory.punctuationIndex = new Map(Array.from(this.punctuationIndex.entries()).map(([key, value]) => [key, new Set(value)]));
        newMemory.priorityIndex = new Map(Array.from(this.priorityIndex.entries()).map(([key, value]) => [key, new Set(value)]));
        newMemory.forgettingStrategy = this.forgettingStrategy;
        newMemory.cycleCounter = this.cycleCounter;
        newMemory.maintenanceFrequency = this.maintenanceFrequency;
        return newMemory;
    }

    /**
     * Clears all data from memory
     */
    clear() {
        this.terms.clear();
        this.shortTermTasks.clear();
        this.longTermTasks.clear();
        this.implicationIndex.clear();
        this.beliefIndex.clear();
        this.costIndex.clear();
        this.punctuationIndex.clear();
        this.priorityIndex.clear();
        this.cycleCounter = 0;
        this._invalidateTaskCache();
    }

    /**
     * Gets statistics about memory usage
     * @returns {object} Memory statistics
     */
    getStatistics() {
        return {
            terms: this.terms.size,
            shortTermTasks: this.shortTermTasks.size,
            longTermTasks: this.longTermTasks.size,
            implications: this.implicationIndex.size,
            beliefs: this.beliefIndex.size,
            costs: this.costIndex.size
        };
    }

    /**
     * Gets all belief tasks (punctuation '.')
     * @returns {Task[]} Array of belief tasks
     */
    getBeliefs() {
        return this.queryTasks({
            punctuation: '.'
        });
    }

    /**
     * Gets all goal tasks (punctuation '!')
     * @returns {Task[]} Array of goal tasks
     */
    getGoals() {
        return this.queryTasks({
            punctuation: '!'
        });
    }

    /**
     * Gets all question tasks (punctuation '?')
     * @returns {Task[]} Array of question tasks
     */
    getQuestions() {
        return this.queryTasks({
            punctuation: '?'
        });
    }

    /**
     * Gets the most recently created tasks
     * @param {number} [count=10] - Number of recent tasks to retrieve
     * @returns {Task[]} Array of recent tasks
     */
    getRecentTasks(count = 10) {
        // Use a more efficient approach for getting recent tasks
        const allTasks = this.getAllTasks();
        if (allTasks.length <= count) {
            // If we need most or all tasks, just sort them
            return [...allTasks].sort((a, b) => Number(b.state.stamp.creationTime) - Number(a.state.stamp.creationTime));
        }
        // For large collections, use a partial sort or heap-based approach
        // This is a simple approach - could be further optimized with a min-heap
        return [...allTasks]
            .sort((a, b) => Number(b.state.stamp.creationTime) - Number(a.state.stamp.creationTime))
            .slice(0, count);
    }

    /**
     * Queries tasks with various filters
     * @param {object} [filters={}] - Query filters
     * @param {string} [filters.punctuation] - Filter by punctuation type
     * @param {string} [filters.termKey] - Filter by term key
     * @param {number} [filters.minPriority] - Filter by minimum priority
     * @param {number} [filters.minConfidence] - Filter by minimum confidence
     * @param {number} [filters.limit] - Limit the number of results
     * @returns {Task[]} Array of matching tasks
     */
    queryTasks(filters = {}) {
        let tasks;

        // Use indexes for common filters to improve performance
        if (filters.punctuation && this.punctuationIndex.has(filters.punctuation)) {
            // Use punctuation index for faster lookup
            const taskIds = this.punctuationIndex.get(filters.punctuation);
            tasks = Array.from(taskIds).map(id => this.getTask(id)).filter(Boolean);
        } else {
            // Fall back to full scan if no suitable index
            tasks = this.getAllTasks();
        }

        if (filters.termKey) {
            tasks = tasks.filter(task => task.termKey === filters.termKey);
        }
        if (filters.minPriority !== undefined) {
            tasks = tasks.filter(task => task.state.priority >= filters.minPriority);
        }
        if (filters.minConfidence !== undefined) {
            tasks = tasks.filter(task => task.state.truthValue.confidence >= filters.minConfidence);
        }

        tasks.sort((a, b) => b.state.priority - a.state.priority);

        if (filters.limit !== undefined) {
            tasks = tasks.slice(0, filters.limit);
        }

        return tasks;
    }

    /**
     * Exports the current memory state as JSON
     * @returns {string} JSON representation of memory state
     */
    exportState() {
        return JSON.stringify({
            terms: Array.from(this.terms.values()),
            shortTermTasks: Array.from(this.shortTermTasks.values()),
            longTermTasks: Array.from(this.longTermTasks.values())
        }, null, 2);
    }

    /**
     * Creates a task from JSON data
     * @param {object} json - JSON representation of a task
     * @returns {Task|null} The created task or null if invalid
     * @private
     */
    _createTaskFromJSON(json) {
        if (!json || !json.termKey) {
            return null;
        }

        const term = this.getTerm(json.termKey);
        if (!term) {
            return null;
        }

        // Convert stamp strings back to BigInts
        const deserializedStamp = {
            ...json.state.stamp
        };
        for (const key in deserializedStamp) {
            // A simple check if the string represents a number
            if (typeof deserializedStamp[key] === 'string' && /^\d+$/.test(deserializedStamp[key])) {
                deserializedStamp[key] = BigInt(deserializedStamp[key]);
            }
        }

        const task = new Task(term, json.punctuation, json.state.truthValue, deserializedStamp);
        task.id = json.id; // Preserve original ID
        task.state.priority = json.state.priority;

        return task;
    }

    /**
     * Imports memory state from JSON
     * @param {string} jsonState - JSON representation of memory state
     */
    importState(jsonState) {
        const state = JSON.parse(jsonState);

        this.clear();

        if (state.terms) {
            for (const termData of state.terms) {
                const term = Term.fromJSON(termData);
                if (term) {
                    this.addTerm(term);
                }
            }
        }

        if (state.shortTermTasks) {
            for (const taskData of state.shortTermTasks) {
                const task = this._createTaskFromJSON(taskData);
                if (task) {
                    this.shortTermTasks.set(task.id, task);
                    this._indexTask(task);
                }
            }
        }

        if (state.longTermTasks) {
            for (const taskData of state.longTermTasks) {
                const task = this._createTaskFromJSON(taskData);
                if (task) {
                    this.longTermTasks.set(task.id, task);
                    this._indexTask(task);
                }
            }
        }

        this._invalidateTaskCache();
    }
}

export default Memory;
