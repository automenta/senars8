process.env.ORT_LOGGING_LEVEL = 'FATAL';

import registerDefaultActions from './default-actions.js';
import {createModuleErrorHandler} from '../utils/error-handler.js';
import {debug, error, info, warn} from '../utils/logger.js';
import {normalizeToArray} from '../utils/helpers.js';
import Introspection from './Introspection.js';

// Create a module-specific error handler
const errorHandler = createModuleErrorHandler('System');

/**
 * System is the main entry point for the SeNARS cognitive architecture.
 * It manages all components and orchestrates the cognitive cycle.
 */
class System {
    /**
     * Private constructor, use SystemFactory.createSystem() instead.
     * @param {object} config - The system's configuration object.
     * @param {object} components - An object containing all required system components.
     * @private
     */
    constructor(config = {}, {memory, reasoner, lm, actionExecutor, cycle}) {
        this.config = config;
        this.memory = memory;
        this.reasoner = reasoner;
        this.lm = lm;
        this.actionExecutor = actionExecutor;
        this.cycle = cycle;

        registerDefaultActions(this.actionExecutor);

        this.isRunning = false;
        this.cycleCount = 0;

        /**
         * The introspection API for observing the system's state.
         * @type {Introspection}
         */
        this.introspection = new Introspection(this);

        info('System components created');
    }

    async initialize(constitutionTasks) {
        return await errorHandler.safeAsync(async () => {
            info('System: Initializing...');
            if (constitutionTasks) {
                this.memory.addTasks(constitutionTasks);
                await this._bootstrapTerms(constitutionTasks, {
                    sync: true
                });
            }
            await this.cycle.bootstrap(constitutionTasks);
            info('System: Initialized successfully');
        }, 'initialize');
    }

    async _bootstrapTerms(tasks, options = {sync: false}) {
        return await errorHandler.safeAsync(async () => {
            const termKeys = [...new Set(tasks.map(task => task.termKey))];
            const newTermKeys = termKeys.filter(key => !this.memory.getTerm(key));
            if (newTermKeys.length === 0) {
                return;
            }

            debug(`Bootstrapping ${newTermKeys.length} new terms`);
            const termPromises = newTermKeys.map(key => this.lm.bootstrapTerm(key, options));
            const newTerms = (await Promise.all(termPromises)).filter(Boolean);
            newTerms.forEach(term => this.memory.addTerm(term));
            info(`Successfully bootstrapped ${newTerms.length} terms`);
        }, '_bootstrapTerms');
    }

    /**
     * Runs a single cognitive cycle.
     * @returns {Promise<object>} A promise that resolves to the cycle results.
     */
    async runCycle() {
        return await errorHandler.safeAsync(async () => {
            this.cycleCount++;
            debug(`Running cycle ${this.cycleCount}`);
            const result = await this.cycle.runOnce();
            debug(`Cycle ${this.cycleCount} completed`, result);
            return result;
        }, 'runCycle');
    }

    /**
     * Starts the cognitive system and runs cycles continuously.
     * @param {number} [maxCycles=0] - Maximum number of cycles to run (0 for infinite).
     * @returns {Promise<void>} A promise that resolves when the system stops.
     */
    async start(maxCycles = 0) {
        return await errorHandler.safeAsync(async () => {
            if (this.isRunning) {
                warn('System is already running');
                return;
            }

            info(`Starting system with maxCycles=${maxCycles}`);
            this.isRunning = true;
            this.cycleCount = 0;
            this.lm.startEmbeddingProcessor();

            while (this.isRunning && (maxCycles === 0 || this.cycleCount < maxCycles)) {
                try {
                    await this.runCycle();
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (err) {
                    error('Error during system cycle execution:', err);
                    this.stop();
                    throw errorHandler.handle(err, 'start', true);
                }
            }

            if (this.isRunning) {
                this.stop();
            }

            info(`System stopped after ${this.cycleCount} cycles`);
        }, 'start');
    }

    /**
     * Stops the continuous execution of cognitive cycles.
     */
    stop() {
        return errorHandler.safeSync(() => {
            if (!this.isRunning) {
                return;
            }
            this.isRunning = false;
            this.lm.stopEmbeddingProcessor();
            info('System stopped');
        }, 'stop');
    }

    /**
     * Adds new tasks to the system's memory.
     * @param {Task|Task[]} tasks - The task or array of tasks to add.
     * @returns {Promise<void>} A promise that resolves when tasks are added.
     */
    async addTasks(tasks) {
        return await errorHandler.safeAsync(async () => {
            const tasksToAdd = normalizeToArray(tasks);
            debug(`Adding ${tasksToAdd.length} tasks to system`);
            await this._bootstrapTerms(tasksToAdd);
            this.memory.addTasks(tasksToAdd);
            info(`Successfully added ${tasksToAdd.length} tasks`);
        }, 'addTasks');
    }
}

export default System;
