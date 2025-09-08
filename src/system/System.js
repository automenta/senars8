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
const {info, error, debug} = require('../utils/logger');

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
            const tasksToAdd = Array.isArray(tasks) ? tasks : [tasks];
            debug(`Adding ${tasksToAdd.length} tasks to system`);
            await this._bootstrapTerms(tasksToAdd);
            this.memory.addTasks(tasksToAdd);
            info(`Successfully added ${tasksToAdd.length} tasks`);
        } catch (err) {
            error('Error adding tasks to system:', err);
            throw handleError(err, 'Task addition failed');
        }
    }
}

module.exports = System;