process.env.ORT_LOGGING_LEVEL = 'FATAL';

import registerDefaultActions from './default-actions.js';
import { createModuleErrorHandler } from '../utils/error-handler.js';
import { debug, error, info, warn } from '../utils/logger.js';
import { normalizeToArray } from '../utils/helpers.js';
import Introspection from './Introspection.js';

const errorHandler = createModuleErrorHandler('System');

/**
 * The main entry point for the SeNARS cognitive architecture. It manages all
 * cognitive components and orchestrates the primary cognitive cycle.
 * Use SystemFactory.createSystem() for instantiation.
 */
class System {
    /**
     * @param {object} config - The system's configuration object.
     * @param {object} components - An object containing all required system components.
     * @private
     */
    constructor(config = {}, { memory, reasoner, lm, actionExecutor, cycle }) {
        this.config = config;
        this.memory = memory;
        this.reasoner = reasoner;
        this.lm = lm;
        this.actionExecutor = actionExecutor;
        this.cycle = cycle;
        this.isRunning = false;
        this.cycleCount = 0;

        /**
         * The public API for observing the system's internal state and events.
         * @type {Introspection}
         */
        this.introspection = new Introspection(this);

        registerDefaultActions(this.actionExecutor);
        info('System components created and initialized.');
    }

    /**
     * Initializes the system with a set of foundational beliefs (the constitution).
     * @param {Task[]} constitutionTasks - An array of tasks representing the system's core principles.
     * @returns {Promise<void>}
     */
    async initialize(constitutionTasks) {
        await errorHandler.safeAsync(async () => {
            info('System: Initializing with constitution...');
            if (constitutionTasks?.length > 0) {
                this.memory.addTasks(constitutionTasks);
                await this._bootstrapTerms(constitutionTasks, { sync: true });
            }
            await this.cycle.bootstrap(constitutionTasks);
            info('System: Initialized successfully.');
        }, 'initialize');
    }

    /**
     * Ensures all terms within a set of tasks are loaded into memory, bootstrapping them via the LM if necessary.
     * @param {Task[]} tasks - The tasks whose terms need to be bootstrapped.
     * @param {object} [options={sync: false}] - Options for the bootstrapping process.
     * @private
     */
    async _bootstrapTerms(tasks, options = { sync: false }) {
        await errorHandler.safeAsync(async () => {
            const newTermKeys = [...new Set(tasks.map(task => task.termKey))]
                .filter(key => !this.memory.getTerm(key));
            if (newTermKeys.length === 0) return;

            debug(`Bootstrapping ${newTermKeys.length} new terms...`);
            const termPromises = newTermKeys.map(key => this.lm.bootstrapTerm(key, options));
            const newTerms = (await Promise.all(termPromises)).filter(Boolean);
            newTerms.forEach(term => this.memory.addTerm(term));
            info(`Successfully bootstrapped ${newTerms.length} terms.`);
        }, '_bootstrapTerms');
    }

    /**
     * Runs a single cognitive cycle, the fundamental unit of thought in the system.
     * @returns {Promise<object>} A promise that resolves to the results of the cycle.
     */
    async runCycle() {
        return await errorHandler.safeAsync(async () => {
            this.cycleCount++;
            debug(`Running cycle ${this.cycleCount}...`);
            const result = await this.cycle.runOnce();
            debug(`Cycle ${this.cycleCount} completed.`, result);
            return result;
        }, 'runCycle');
    }

    /**
     * Starts the continuous execution of cognitive cycles.
     * @param {number} [maxCycles=0] - Maximum number of cycles to run. If 0, runs indefinitely.
     * @returns {Promise<void>} A promise that resolves when the system stops.
     */
    async start(maxCycles = 0) {
        await errorHandler.safeAsync(async () => {
            if (this.isRunning) {
                warn('System is already running.');
                return;
            }
            info(`Starting system with maxCycles=${maxCycles || 'infinite'}`);
            this.isRunning = true;
            this.cycleCount = 0;
            this.lm.startEmbeddingProcessor();

            while (this.isRunning && (maxCycles === 0 || this.cycleCount < maxCycles)) {
                try {
                    await this.runCycle();
                    await new Promise(resolve => setTimeout(resolve, this.config.cycle?.TICK_DELAY_MS || 50));
                } catch (err) {
                    error('Fatal error during system cycle execution:', err);
                    this.stop(); // Halt on critical error
                    throw errorHandler.handle(err, 'start', true);
                }
            }
            this.stop(); // Ensure stop is called when loop finishes
        }, 'start');
    }

    /**
     * Stops the continuous execution of cognitive cycles.
     */
    stop() {
        errorHandler.safeSync(() => {
            if (!this.isRunning) return;
            this.isRunning = false;
            this.lm.stopEmbeddingProcessor();
            info(`System stopped after ${this.cycleCount} cycles.`);
        }, 'stop');
    }

    /**
     * Adds new tasks (beliefs, goals, etc.) to the system's memory.
     * @param {Task|Task[]} tasks - The task or array of tasks to add.
     * @returns {Promise<void>}
     */
    async addTasks(tasks) {
        await errorHandler.safeAsync(async () => {
            const tasksToAdd = normalizeToArray(tasks);
            if (tasksToAdd.length === 0) return;

            debug(`Adding ${tasksToAdd.length} new tasks to the system...`);
            await this._bootstrapTerms(tasksToAdd);
            this.memory.addTasks(tasksToAdd);
            info(`Successfully added ${tasksToAdd.length} tasks.`);
        }, 'addTasks');
    }
}

export default System;
