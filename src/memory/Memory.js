const Term = require('../core/Term');
const Task = require('../core/Task');
const EventBus = require('../system/EventBus');
const config = require('../config');
const {isBelief} = require('../utils/task-utils');

class Memory {
    constructor() {
        // Core data structures for storing terms and tasks
        this.terms = new Map();
        this.shortTermTasks = new Map();
        this.longTermTasks = new Map();
        
        // Indexes for efficient lookups of specific types of information
        this.implicationIndex = new Map();  // Index of implications by goal term
        this.beliefIndex = new Map();       // Index of beliefs by term key (maps termKey to array of tasks)
        this.costIndex = new Map();         // Index of action costs

        // Maintenance settings for memory management
        this.cycleCounter = 0;
        this.maintenanceFrequency = config.memory.MAINTENANCE_CYCLE_FREQUENCY;

        // Cached task list for performance
        this._cachedAllTasks = null;

        // Load forgetting strategy for memory pruning
        this._loadForgettingStrategy();

        // Register event listeners for automatic task management
        EventBus.on('NewTasksCreated', (tasks) => this.addTasks(tasks));
        EventBus.on('SystemCycleEnded', () => this._handleSystemCycleEnded());
    }

    /**
     * Load the configured forgetting strategy or fall back to default
     * @private
     */
    _loadForgettingStrategy() {
        const strategyName = config.memory.FORGETTING_STRATEGY_NAME;
        try {
            const StrategyClass = require(`./strategies/${strategyName}ForgettingStrategy`);
            this.forgettingStrategy = new StrategyClass();
        } catch (error) {
            // Silently fall back to default strategy if the configured one fails to load
            const DefaultStrategy = require('./strategies/TimeBasedForgettingStrategy');
            this.forgettingStrategy = new DefaultStrategy();
        }
    }

    /**
     * Handle system cycle completion by performing memory maintenance
     * @private
     */
    _handleSystemCycleEnded() {
        this.cycleCounter++;
        // Perform maintenance at configured frequency
        if (this.cycleCounter % this.maintenanceFrequency === 0) {
            this._consolidateMemory();
            this._pruneMemory();
        }
    }

    /**
     * Consolidate memory by moving high-priority or high-confidence tasks to long-term storage
     * @private
     */
    _consolidateMemory() {
        const priorityThreshold = config.memory.CONSOLIDATION_PRIORITY_THRESHOLD;
        const confidenceThreshold = config.memory.CONSOLIDATION_CONFIDENCE_THRESHOLD;

        // Iterate through short-term tasks to identify candidates for consolidation
        const tasksToMove = [];
        for (const [taskId, task] of this.shortTermTasks.entries()) {
            // Check if task meets consolidation criteria
            const isHighPriority = task.state.priority >= priorityThreshold;
            const isHighConfidence = task.state.truthValue.confidence >= confidenceThreshold;

            // Collect qualifying tasks for consolidation
            if (isHighPriority || isHighConfidence) {
                tasksToMove.push([taskId, task]);
            }
        }

        // Move qualifying tasks to long-term storage in batch
        for (const [taskId, task] of tasksToMove) {
            this.longTermTasks.set(taskId, task);
            this.shortTermTasks.delete(taskId);
        }
        
        // Invalidate cached task list since we've moved tasks
        this._cachedAllTasks = null;
    }

    /**
     * Prune memory using the configured forgetting strategy
     * @private
     */
    _pruneMemory() {
        // Apply forgetting strategy if available
        if (this.forgettingStrategy) {
            const options = config.memory.FORGETTING_STRATEGY_OPTIONS || {};
            this.shortTermTasks = this.forgettingStrategy.prune(this.shortTermTasks, options.shortTerm);
            this.longTermTasks = this.forgettingStrategy.prune(this.longTermTasks, options.longTerm);
            // Invalidate cached task list since we've pruned tasks
            this._cachedAllTasks = null;
        }
    }

    /**
     * Add a term to memory
     * @param {Term} term - The term to add
     */
    addTerm(term) {
        // Validate input
        if (!term) {
            throw new Error('Term cannot be null or undefined');
        }
        
        if (!(term instanceof Term)) {
            throw new Error('Can only add Term instances to memory.');
        }
        
        // Skip if term already exists
        if (this.terms.has(term.key)) {
            return;
        }
        
        // Add term to memory
        this.terms.set(term.key, term);

        // Update implication index for implication terms
        if (term.type === 'Implication' && term.subject) {
            // Extract goal term from sequential conjunction if present
            const goalTerm = (term.subject.type === 'SequentialConjunction' && term.subject.terms.length > 0)
                ? term.subject.terms[0]
                : term.subject;
            const goalKey = goalTerm.key;
            
            // Initialize implication index entry if needed
            if (!this.implicationIndex.has(goalKey)) {
                this.implicationIndex.set(goalKey, []);
            }
            // Add implication to index
            this.implicationIndex.get(goalKey).push(term);
        }
    }

    /**
     * Get a term from memory by key
     * @param {string} key - The term key to look up
     * @returns {Term|null} The term or null if not found
     */
    getTerm(key) {
        if (!key) {
            return null;
        }
        return this.terms.get(key);
    }

    /**
     * Add tasks to memory
     * @param {Task|Task[]} tasks - The task(s) to add
     */
    addTasks(tasks) {
        // Handle empty input
        if (!tasks) {
            return;
        }
        
        // Normalize to array
        const {normalizeToArray} = require('../utils/array-utils');
        const tasksToAdd = normalizeToArray(tasks);
        
        // Process each task
        for (const task of tasksToAdd) {
            // Skip null/undefined tasks
            if (!task) {
                continue;
            }
            
            // Validate task type
            if (!(task instanceof Task)) {
                throw new Error('Can only add Task instances to memory.');
            }
            
            // Add new tasks to short-term memory
            this.shortTermTasks.set(task.id, task);

            // Update indexes for belief tasks
            if (isBelief(task)) {
                // Initialize belief index entry if needed
                if (!this.beliefIndex.has(task.termKey)) {
                    this.beliefIndex.set(task.termKey, []);
                }
                // Add belief to index
                this.beliefIndex.get(task.termKey).push(task);
                this._updateCostIndex(task.term, 'add');
            }
        }
        
        // Invalidate cached task list
        this._cachedAllTasks = null;
    }

    /**
     * Get a task from memory by ID
     * @param {string} id - The task ID to look up
     * @returns {Task|null} The task or null if not found
     */
    getTask(id) {
        if (!id) {
            return null;
        }
        return this.shortTermTasks.get(id) || this.longTermTasks.get(id);
    }

    /**
     * Remove a task from memory by ID
     * @param {string} taskId - The task ID to remove
     */
    removeTask(taskId) {
        // Validate input
        if (!taskId) {
            return;
        }
        
        // Find task in either memory store
        const task = this.shortTermTasks.get(taskId) || this.longTermTasks.get(taskId);
        if (task) {
            // Remove from both memory stores
            this.shortTermTasks.delete(taskId);
            this.longTermTasks.delete(taskId);
            
            // Update indexes for belief tasks
            if (isBelief(task)) {
                // Remove task from belief index
                if (this.beliefIndex.has(task.termKey)) {
                    const beliefs = this.beliefIndex.get(task.termKey);
                    const index = beliefs.indexOf(task);
                    if (index !== -1) {
                        beliefs.splice(index, 1);
                        // Clean up empty arrays
                        if (beliefs.length === 0) {
                            this.beliefIndex.delete(task.termKey);
                        }
                    }
                }
                this._updateCostIndex(task.term, 'remove');
            }
            
            // Invalidate cached task list
            this._cachedAllTasks = null;
        }
    }

    /**
     * Update the cost index for action terms
     * @private
     * @param {Term} term - The term to process
     * @param {string} operation - The operation type ('add' or 'remove')
     */
    _updateCostIndex(term, operation) {
        // Skip if no term provided
        if (!term) {
            return;
        }
        
        // Process inheritance terms with intensional set predicates containing costs
        if (term.type === 'Inheritance' && 
            term.subject && 
            term.predicate?.type === 'IntensionalSet' && 
            term.predicate.terms.length === 1) {
            
            // Extract and validate cost value
            const cost = parseFloat(term.predicate.terms[0].key);
            if (!isNaN(cost)) {
                const actionKey = term.subject.key;
                // Update cost index based on operation
                if (operation === 'add') {
                    this.costIndex.set(actionKey, cost);
                } else {
                    this.costIndex.delete(actionKey);
                }
            }
        }
    }

    /**
     * Get all tasks from both short-term and long-term memory
     * @returns {Task[]} Array of all tasks
     */
    getAllTasks() {
        // Cache the combined tasks array to avoid recreating it unnecessarily
        if (!this._cachedAllTasks) {
            this._cachedAllTasks = [
                ...this.shortTermTasks.values(),
                ...this.longTermTasks.values()
            ];
        }
        return this._cachedAllTasks;
    }

    /**
     * Get the highest priority tasks from memory
     * @param {number} k - The number of tasks to retrieve
     * @returns {Task[]} Array of highest priority tasks
     */
    getHighestPriorityTasks(k = 20) {
        // Handle invalid input
        if (k <= 0) {
            return [];
        }
        
        // Get all tasks and sort them by priority (highest first)
        const allTasks = this.getAllTasks();
        
        // For small k, use a partial sort for better performance
        if (k < 50 && k < allTasks.length / 10) {
            // Use a min-heap based approach for small k with large datasets
            const {MinPriorityQueue} = require('@datastructures-js/priority-queue');
            const pq = new MinPriorityQueue({ priority: (task) => task.state.priority });
            
            for (const task of allTasks) {
                if (pq.size() < k) {
                    pq.enqueue(task);
                } else if (task.state.priority > pq.front().priority) {
                    pq.dequeue();
                    pq.enqueue(task);
                }
            }
            
            // Extract tasks in descending order of priority
            const result = [];
            while (!pq.isEmpty()) {
                result.unshift(pq.dequeue().element);
            }
            return result;
        } else {
            // For larger k, use a more efficient full sort with a limit
            // Clone the array to avoid modifying the cached version
            const sortedTasks = [...allTasks];
            sortedTasks.sort((a, b) => b.state.priority - a.state.priority);
            return sortedTasks.slice(0, k);
        }
    }

    /**
     * Create a deep clone of this memory instance
     * @returns {Memory} A new memory instance with copied data
     */
    clone() {
        const newMemory = new Memory();
        newMemory.terms = new Map(this.terms);
        newMemory.shortTermTasks = new Map(this.shortTermTasks);
        newMemory.longTermTasks = new Map(this.longTermTasks);
        newMemory.implicationIndex = new Map(this.implicationIndex);
        
        // Deep copy the belief index (arrays of tasks)
        for (const [termKey, tasks] of this.beliefIndex.entries()) {
            newMemory.beliefIndex.set(termKey, [...tasks]);
        }
        
        newMemory.costIndex = new Map(this.costIndex);
        newMemory.forgettingStrategy = this.forgettingStrategy; // shallow copy of strategy
        newMemory.cycleCounter = this.cycleCounter;
        newMemory.maintenanceFrequency = this.maintenanceFrequency;
        return newMemory;
    }
    
    /**
     * Clear all memory contents
     */
    clear() {
        this.terms.clear();
        this.shortTermTasks.clear();
        this.longTermTasks.clear();
        this.implicationIndex.clear();
        this.beliefIndex.clear();
        this.costIndex.clear();
        this.cycleCounter = 0;
        this._cachedAllTasks = null;
    }
    
    /**
     * Get memory statistics
     * @returns {object} Object containing memory statistics
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
     * Find tasks by term key
     * @param {string} termKey - The term key to search for
     * @returns {Task[]} Array of tasks with the specified term key
     */
    findTasksByTermKey(termKey) {
        // First check the belief index for better performance
        if (this.beliefIndex.has(termKey)) {
            return this.beliefIndex.get(termKey);
        }
        
        // Fall back to searching all tasks
        const allTasks = this.getAllTasks();
        return allTasks.filter(task => task.termKey === termKey);
    }

    /**
     * Find tasks by type (belief, goal, question)
     * @param {string} type - The punctuation type ('.', '!', or '?')
     * @returns {Task[]} Array of tasks with the specified type
     */
    findTasksByType(type) {
        const allTasks = this.getAllTasks();
        return allTasks.filter(task => task.punctuation === type);
    }

    /**
     * Get tasks with priority above a threshold
     * @param {number} threshold - The priority threshold
     * @returns {Task[]} Array of high-priority tasks
     */
    getHighPriorityTasks(threshold = 0.5) {
        const allTasks = this.getAllTasks();
        return allTasks.filter(task => task.state.priority >= threshold);
    }
}

module.exports = Memory;
