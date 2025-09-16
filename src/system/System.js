// Import ONNX warning suppression at the very beginning
import '../utils/onnxSuppression.js';

import registerDefaultActions from './default-actions.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';
import {debug, error as logError, info, warn} from '../utils/logger.js';
import {normalizeToArray} from '../utils/helpers.js';
import Introspection from './Introspection.js';
import ConfigManager from '../config/ConfigManager.js';

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
    constructor(config = {}, {memory, reasoner, lm, actionExecutor, cycle}) {
        this.configManager = new ConfigManager(config);
        this.config = this.configManager.getAll();
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
                await this._bootstrapTerms(constitutionTasks, {sync: true});
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
    async _bootstrapTerms(tasks, options = {sync: false}) {
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
     * Runs a single cognitive cycle. This is the fundamental unit of operation in the system,
     * involving perception, reasoning, and action.
     * @returns {Promise<object>} A promise that resolves to an object containing the results of the cycle,
     * such as the number of new tasks derived.
     * @example
     * await system.runCycle();
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
     * Starts the continuous, asynchronous execution of cognitive cycles. The system will
     * run until `stop()` is called or the `maxCycles` limit is reached.
     * @param {number} [maxCycles=0] - The maximum number of cycles to run. If 0 or undefined, the system runs indefinitely.
     * @returns {Promise<void>} A promise that resolves when the system's execution loop has finished.
     * @example
     * // Run for 100 cycles
     * system.start(100);
     *
     * // Run indefinitely
     * system.start();
     */
    async start(maxCycles = 0) {
        if (this.isRunning) {
            warn('System is already running.');
            return;
        }
        info(`Starting system with maxCycles=${maxCycles || 'infinite'}`);
        this.isRunning = true;
        this.cycleCount = 0;
        this.lm.startEmbeddingProcessor();

        try {
            await errorHandler.safeAsync(async () => {
                while (this.isRunning && (maxCycles === 0 || this.cycleCount < maxCycles)) {
                    await this.runCycle();
                    await new Promise(resolve => setTimeout(resolve, this.configManager.getNumber('cycle.TICK_DELAY_MS', 50)));
                }
            }, 'start');
        } finally {
            this.stop(); // Ensure stop is called when loop finishes or on error
        }
    }

    /**
     * Stops the continuous execution of cognitive cycles if the system is running.
     * @example
     * system.stop();
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
     * Adds new tasks to the system's memory. A task can be a belief, a goal, or a question.
     * The system will automatically bootstrap any new terms found in the tasks.
     * @param {Task|Task[]} tasks - A single Task object or an array of Task objects to add.
     * @returns {Promise<void>} A promise that resolves when the tasks have been added.
     * @example
     * import { Task, parseTerm } from 'senars';
     *
     * const belief = new Task(parseTerm('(cat --> mammal)'), '.');
     * await system.addTasks(belief);
     *
     * const goal = new Task(parseTerm('(<cat> --> pet)!'), '!');
     * const question = new Task(parseTerm('(<cat> --> friendly)?'), '?');
     * await system.addTasks([goal, question]);
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
