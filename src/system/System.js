// Suppress ONNX Runtime warnings about unused initializers
process.env.ORT_LOGGING_LEVEL = 'ERROR';

const Memory = require('../memory/Memory');
const Reasoner = require('../reasoner/Reasoner');
const LM = require('../lm/LM');
const Cycle = require('./Cycle');
const ActionExecutor = require('./ActionExecutor');
const CONSTITUTION_TASKS = require('./Constitution');
const registerDefaultActions = require('./default-actions');
const config = require('../config');
const _ = require('lodash');
const {handleError, handleErrorWithDefault} = require('../utils/error-handler');
const {info, error, debug, warn} = require('../utils/logger');

class System {
    constructor(userConfig = {}) {
        this.config = _.merge({}, config, userConfig);
        this.memory = new Memory();
        this.reasoner = new Reasoner();
        this.lm = new LM();
        this.actionExecutor = new ActionExecutor(this.memory);
        this.cycle = new Cycle(this.memory, this.reasoner, this.lm, this.actionExecutor, this.config);
        registerDefaultActions(this.actionExecutor);
        this.isRunning = false;
        this.cycleCount = 0;
        this.initialized = false;
        info('System initialized with config', this.config);
    }

    async _bootstrapTerms(tasks) {
        try {
            const termKeys = [...new Set(tasks.map(task => task.termKey))];
            const newTermKeys = termKeys.filter(key => !this.memory.getTerm(key));
            if (newTermKeys.length === 0) return;

            debug(`Bootstrapping ${newTermKeys.length} new terms`);
            const termPromises = newTermKeys.map(key => this.lm.bootstrapTerm(key));
            const newTerms = (await Promise.all(termPromises)).filter(Boolean);
            newTerms.forEach(term => this.memory.addTerm(term));
            info(`Successfully bootstrapped ${newTerms.length} terms`);
        } catch (err) {
            error('Error during term bootstrapping:', err);
            throw handleError(err, 'Term bootstrapping failed');
        }
    }

    async _ensureInitialized() {
        if (this.initialized) return;
        try {
            this.memory.addTasks(CONSTITUTION_TASKS);
            await this._bootstrapTerms(CONSTITUTION_TASKS);
            this.initialized = true;
            info('System initialized successfully');
        } catch (err) {
            error('Error during system initialization:', err);
            throw handleError(err, 'System initialization failed');
        }
    }

    async initialize() {
        try {
            await this._ensureInitialized();
            info('System initialization completed');
        } catch (err) {
            error('System initialization error:', err);
            throw handleError(err, 'System initialization failed');
        }
    }

    async runCycle() {
        try {
            await this._ensureInitialized();
            this.cycleCount++;
            debug(`Running cycle ${this.cycleCount}`);
            const result = await this.cycle.runOnce();
            debug(`Cycle ${this.cycleCount} completed`, result);
            return result;
        } catch (err) {
            error(`Error in cycle ${this.cycleCount}:`, err);
            throw handleError(err, `Cycle ${this.cycleCount} failed`);
        }
    }

    async start(maxCycles = 0) {
        if (this.isRunning) {
            warn('System is already running');
            return;
        }
        
        try {
            await this._ensureInitialized();
            info(`Starting system with maxCycles=${maxCycles}`);

            this.isRunning = true;
            this.cycleCount = 0;

            while (this.isRunning && (maxCycles === 0 || this.cycleCount < maxCycles)) {
                try {
                    await this.runCycle();
                    // Use a shorter delay for better responsiveness
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (error) {
                    error('Error during system cycle execution:', error);
                    this.stop();
                    throw handleError(error, 'System cycle execution failed');
                }
            }

            if (this.isRunning) {
                this.stop();
            }
            
            info(`System stopped after ${this.cycleCount} cycles`);
        } catch (err) {
            error('Error during system execution:', err);
            this.stop();
            throw handleError(err, 'System execution failed');
        }
    }

    stop() {
        this.isRunning = false;
        info('System stopped');
    }

    async addTasks(tasks) {
        try {
            await this._ensureInitialized();
            const {normalizeToArray} = require('../utils/array-utils');
            const tasksToAdd = normalizeToArray(tasks);
            debug(`Adding ${tasksToAdd.length} tasks to system`);
            await this._bootstrapTerms(tasksToAdd);
            this.memory.addTasks(tasksToAdd);
            info(`Successfully added ${tasksToAdd.length} tasks`);
        } catch (err) {
            error('Error adding tasks to system:', err);
            throw handleError(err, 'Task addition failed');
        }
    }

    /**
     * Get the current memory statistics
     * @returns {object} Memory statistics
     */
    getMemoryStatistics() {
        return this.memory.getStatistics();
    }

    /**
     * Find tasks by term key
     * @param {string} termKey - The term key to search for
     * @returns {Task[]} Array of tasks with the specified term key
     */
    findTasksByTermKey(termKey) {
        return this.memory.findTasksByTermKey(termKey);
    }

    /**
     * Get tasks with priority above a threshold
     * @param {number} threshold - The priority threshold
     * @returns {Task[]} Array of high-priority tasks
     */
    getHighPriorityTasks(threshold = 0.5) {
        return this.memory.getHighPriorityTasks(threshold);
    }

    /**
     * Get a task by its ID
     * @param {string} taskId - The ID of the task to retrieve
     * @returns {Task|null} The task or null if not found
     */
    getTask(taskId) {
        return this.memory.getTask(taskId);
    }

    /**
     * Query tasks using various filters
     * @param {object} filters - Filter criteria
     * @param {string} [filters.termKey] - Term key to match
     * @param {string} [filters.punctuation] - Punctuation type ('.', '!', '?')
     * @param {number} [filters.minPriority] - Minimum priority threshold
     * @param {number} [filters.minConfidence] - Minimum confidence threshold
     * @param {number} [filters.limit] - Maximum number of tasks to return
     * @returns {Task[]} Array of matching tasks
     */
    queryTasks(filters = {}) {
        let tasks = this.memory.getAllTasks();

        // Apply filters
        if (filters.termKey) {
            tasks = tasks.filter(task => task.termKey === filters.termKey);
        }
        
        if (filters.punctuation) {
            tasks = tasks.filter(task => task.punctuation === filters.punctuation);
        }
        
        if (filters.minPriority !== undefined) {
            tasks = tasks.filter(task => task.state.priority >= filters.minPriority);
        }
        
        if (filters.minConfidence !== undefined) {
            tasks = tasks.filter(task => task.state.truthValue.confidence >= filters.minConfidence);
        }
        
        // Sort by priority (highest first)
        tasks.sort((a, b) => b.state.priority - a.state.priority);
        
        // Apply limit
        if (filters.limit !== undefined) {
            tasks = tasks.slice(0, filters.limit);
        }
        
        return tasks;
    }

    /**
     * Revise a task's truth value using Bayesian updating
     * @param {string} taskId - The ID of the task to revise
     * @param {object} newEvidence - The new evidence truth value {frequency, confidence}
     * @param {number} weight - Weight for the new evidence (0-1)
     * @returns {object} The revised truth value
     */
    async reviseTaskTruthValue(taskId, newEvidence, weight = 0.5) {
        try {
            await this._ensureInitialized();
            const task = this.memory.getTask(taskId);
            if (!task) {
                throw new Error(`Task with ID ${taskId} not found`);
            }

            const TruthValueManager = require('../reasoner/TruthValueManager');
            const truthValueManager = new TruthValueManager();
            const revisedTruthValue = truthValueManager.bayesianRevision(task, newEvidence, weight);
            
            debug(`Revised truth value for task ${taskId}`);
            return revisedTruthValue;
        } catch (err) {
            error('Error revising task truth value:', err);
            throw handleError(err, 'Task truth value revision failed');
        }
    }

    /**
     * Remove a task from the system
     * @param {string} taskId - The ID of the task to remove
     */
    async removeTask(taskId) {
        try {
            await this._ensureInitialized();
            this.memory.removeTask(taskId);
            debug(`Removed task ${taskId}`);
            info(`Successfully removed task ${taskId}`);
        } catch (err) {
            error('Error removing task:', err);
            throw handleError(err, 'Task removal failed');
        }
    }

    /**
     * Export the current memory state to a JSON object
     * @returns {object} Serializable representation of the memory state
     */
    exportMemoryState() {
        const terms = Array.from(this.memory.terms.entries()).map(([key, term]) => ({
            key: term.key,
            embedding: Array.from(term.embedding),
            complexity: term.complexity
        }));

        const tasks = this.memory.getAllTasks().map(task => ({
            id: task.id,
            termKey: task.termKey,
            punctuation: task.punctuation,
            state: {
                priority: task.state.priority,
                truthValue: {...task.state.truthValue},
                stamp: {
                    creationTime: Number(task.state.stamp.creationTime),
                    lastAccessed: Number(task.state.stamp.lastAccessed),
                    ...(task.state.stamp.occurrenceTime && { occurrenceTime: Number(task.state.stamp.occurrenceTime) }),
                    ...(task.state.stamp.endTime && { endTime: Number(task.state.stamp.endTime) })
                }
            }
        }));

        return {
            terms,
            tasks,
            timestamp: Date.now()
        };
    }

    /**
     * Import memory state from a JSON object
     * @param {object} state - Serializable representation of the memory state
     */
    async importMemoryState(state) {
        try {
            await this._ensureInitialized();
            
            // Clear existing memory
            this.memory.clear();
            
            // Import terms
            const Term = require('../core/Term');
            for (const termData of state.terms) {
                const term = new Term(termData.key, termData.embedding, termData.complexity);
                this.memory.addTerm(term);
            }
            
            // Import tasks
            const Task = require('../core/Task');
            const { parseTerm } = require('../parser/narseseParser');
            for (const taskData of state.tasks) {
                try {
                    const term = this.memory.getTerm(taskData.termKey) || parseTerm(taskData.termKey);
                    if (term) {
                        const task = new Task(term, taskData.punctuation, taskData.state.truthValue, {
                            creationTime: BigInt(taskData.state.stamp.creationTime),
                            lastAccessed: BigInt(taskData.state.stamp.lastAccessed),
                            ...(taskData.state.stamp.occurrenceTime && { occurrenceTime: BigInt(taskData.state.stamp.occurrenceTime) }),
                            ...(taskData.state.stamp.endTime && { endTime: BigInt(taskData.state.stamp.endTime) })
                        });
                        // Manually set the task ID to preserve it
                        task.id = taskData.id;
                        this.memory.addTasks([task]);
                    }
                } catch (err) {
                    error(`Error importing task ${taskData.id}:`, err);
                }
            }
            
            info(`Successfully imported memory state with ${state.terms.length} terms and ${state.tasks.length} tasks`);
        } catch (err) {
            error('Error importing memory state:', err);
            throw handleError(err, 'Memory state import failed');
        }
    }
}

module.exports = System;