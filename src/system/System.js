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
const {handleError} = require('../utils/error-handler');
const {info, error, debug, warn} = require('../utils/logger');
const {normalizeToArray} = require('../utils/array-utils');
const { importMemoryState, exportMemoryState } = require('../memory/memoryUtils');
const TruthValueManager = require('../reasoner/TruthValueManager');

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

        this.initialize = this._withInitialization(this.initialize);
        this.runCycle = this._withInitialization(this.runCycle);
        this.start = this._withInitialization(this.start);
        this.addTasks = this._withInitialization(this.addTasks);
        this.reviseTaskTruthValue = this._withInitialization(this.reviseTaskTruthValue);
        this.removeTask = this._withInitialization(this.removeTask);
        this.importMemoryState = this._withInitialization(this.importMemoryState);
    }

    _withInitialization(fn) {
        return async (...args) => {
            await this._ensureInitialized();
            return fn.apply(this, args);
        };
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
            info('System initialization completed');
        } catch (err) {
            error('System initialization error:', err);
            throw handleError(err, 'System initialization failed');
        }
    }

    async runCycle() {
        try {
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
            info(`Starting system with maxCycles=${maxCycles}`);

            this.isRunning = true;
            this.cycleCount = 0;

            while (this.isRunning && (maxCycles === 0 || this.cycleCount < maxCycles)) {
                try {
                    await this.runCycle();
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


    getMemoryStatistics() {
        return this.memory.getStatistics();
    }

    findTasksByTermKey(termKey) {
        return this.memory.queryTasks({ termKey });
    }

    getHighPriorityTasks(threshold = 0.5) {
        return this.memory.getHighPriorityTasks(threshold);
    }

    getTask(taskId) {
        return this.memory.getTask(taskId);
    }

    getTerm(termKey) {
        return this.memory.getTerm(termKey);
    }

    getAllTasks() {
        return this.memory.getAllTasks();
    }

    getAllTerms() {
        return Array.from(this.memory.terms.values());
    }

    getBeliefs() {
        return this.memory.getBeliefs();
    }

    getGoals() {
        return this.memory.getGoals();
    }

    getQuestions() {
        return this.memory.getQuestions();
    }

    getTopPriorityTasks(count = 10) {
        return this.memory.getHighestPriorityTasks(count);
    }

    getRecentTasks(count = 10) {
        return this.memory.getRecentTasks(count);
    }

    queryTasks(filters = {}) {
        return this.memory.queryTasks(filters);
    }

    async reviseTaskTruthValue(taskId, newEvidence, weight = 0.5) {
        try {
            const task = this.memory.getTask(taskId);
            if (!task) {
                throw new Error(`Task with ID ${taskId} not found`);
            }

            const truthValueManager = new TruthValueManager();
            const revisedTruthValue = truthValueManager.bayesianRevision(task, newEvidence, weight);
            
            debug(`Revised truth value for task ${taskId}`);
            return revisedTruthValue;
        } catch (err) {
            error('Error revising task truth value:', err);
            throw handleError(err, 'Task truth value revision failed');
        }
    }

    async removeTask(taskId) {
        try {
            this.memory.removeTask(taskId);
            debug(`Removed task ${taskId}`);
            info(`Successfully removed task ${taskId}`);
        } catch (err) {
            error('Error removing task:', err);
            throw handleError(err, 'Task removal failed');
        }
    }

    exportMemoryState() {
        return exportMemoryState(this.memory);
    }

    async importMemoryState(state) {
        await importMemoryState(this.memory, state);
    }

    getAvailableRules() {
        return this.reasoner.getRuleNames();
    }

    getRuleInfo(ruleName) {
        const rule = this.reasoner.getRule(ruleName);
        return rule ? {
            name: rule.name,
            arity: rule.arity,
            description: rule.description || 'No description available'
        } : null;
    }

    getStatus() {
        return {
            initialized: this.initialized,
            isRunning: this.isRunning,
            cycleCount: this.cycleCount,
            memory: this.memory.getStatistics(),
            rules: this.reasoner.getRuleNames().length
        };
    }

    getConfig() {
        return {...this.config};
    }
}

module.exports = System;