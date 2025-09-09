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
const {normalizeToArray} = require('../utils/helpers');
const TruthValueManager = require('../reasoner/TruthValueManager');
const {forwardMethods} = require('../utils/method-forwarding');

class System {
    // Private constructor, use System.create() instead
    constructor(userConfig = {}) {
        this.config = _.merge({}, config, userConfig);
        this.memory = new Memory();
        this.reasoner = new Reasoner();
        this.lm = new LM();
        this.actionExecutor = new ActionExecutor(this.memory);
        this.cycle = new Cycle(this.memory, this.reasoner, this.lm, this.actionExecutor, this.config);

        registerDefaultActions(this.actionExecutor);
        this._forwardMemoryMethods();

        this.isRunning = false;
        this.cycleCount = 0;

        info('System components created');
    }

    static async create(userConfig = {}) {
        const system = new System(userConfig);
        try {
            info('Initializing system...');
            system.memory.addTasks(CONSTITUTION_TASKS);
            await system._bootstrapTerms(CONSTITUTION_TASKS);
            await system.cycle.bootstrap();
            info('System initialized successfully');
            return system;
        } catch (err) {
            error('Error during system initialization:', err);
            throw handleError(err, 'System initialization failed');
        }
    }

    _forwardMemoryMethods() {
        const memoryMethods = Memory.getForwardableMethods();
        forwardMethods(this, this.memory, memoryMethods);
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

    async reviseTaskTruthValue(taskId, newEvidence, weight = 0.5) {
        try {
            const task = this.memory.getTask(taskId);
            if (!task) {
                throw new Error(`Task with ID ${taskId} not found`);
            }
            const revisedTruthValue = TruthValueManager.bayesianRevision(task.state.truthValue, newEvidence, weight);
            task.state.truthValue = revisedTruthValue;
            debug(`Revised truth value for task ${taskId}`);
            return revisedTruthValue;
        } catch (err) {
            error('Error revising task truth value:', err);
            throw handleError(err, 'Task truth value revision failed');
        }
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