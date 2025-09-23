import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import {debug, error as logError, info, warn} from '../utils/logger.js';
import {normalizeToArray} from '../utils/collections/index.js';
import Introspection from './Introspection.js';
import createConfigAccessor from '../config/ConfigAccessor.js';
import registerDefaultActions from './default-actions.js';

const errorHandler = createUnifiedErrorHandler('System');

class System {
    /**
     * Initializes the System with all its components.
     * @param {object} configManager - The configuration manager instance.
     * @param {object} components - The core components of the system.
     * @param {object} components.memory - The memory component.
     * @param {object} components.reasoner - The reasoner component.
     * @param {object} components.lm - The language model component.
     * @param {object} components.actionExecutor - The action executor component.
     * @param {object} components.cycle - The cognitive cycle component.
     * @param {object} components.planner - The planner component.
     * @param {object} components.metaCognition - The meta-cognition component.
     * @param {object} components.perception - The perception component.
     */
    constructor(configManager, {
        memory,
        reasoner,
        lm,
        actionExecutor,
        cycle,
        planner,
        metaCognition,
        perception
    }) {
        debug('System: Constructor called with components:', {
            memory,
            reasoner,
            lm,
            actionExecutor,
            cycle,
            planner,
            metaCognition,
            perception
        });
        this.config = createConfigAccessor(configManager, 'system');
        this.memory = memory;
        this.reasoner = reasoner;
        this.lm = lm;
        this.actionExecutor = actionExecutor;
        this.cycle = cycle;
        this.planner = planner;
        this.metaCognition = metaCognition;
        this.perception = perception;
        this.isRunning = false;
        this.cycleCount = 0;
        this.introspection = new Introspection(this);

        registerDefaultActions(this.actionExecutor);
        info('System components created and initialized.');
    }

    /**
     * Initializes the system with a constitution (a set of core tasks).
     * @param {Array<object>} constitutionTasks - The initial tasks to seed the system.
     */
    async initialize(constitutionTasks) {
        await errorHandler.execute(async () => {
            info('System: Initializing with constitution...');
            if (constitutionTasks?.length > 0) {
                this.memory.addTasks(constitutionTasks);
                await this._bootstrapTerms(constitutionTasks, {
                    sync: true
                });
            }
            await this.cycle.bootstrap(constitutionTasks);
            info('System: Initialized successfully.');
        }, 'initialize');
    }

    async _bootstrapTerms(tasks, options = {
        sync: false
    }) {
        await errorHandler.execute(async () => {
            const newTermKeys = [...new Set(tasks.map(task => task.termKey).filter(key => !this.memory.getTerm(key)))];
            if (!newTermKeys.length) return;

            debug(`Bootstrapping ${newTermKeys.length} new terms...`);
            const newTerms = (await Promise.all(newTermKeys.map(key => this.lm.bootstrapTerm(key, options)))).filter(Boolean);
            newTerms.forEach(term => this.memory.addTerm(term));
            info(`Successfully bootstrapped ${newTerms.length} terms.`);
        }, '_bootstrapTerms');
    }

    /**
     * Runs a single cognitive cycle.
     * @returns {Promise<object>} A promise that resolves with the result of the cycle.
     */
    async runCycle() {
        return await errorHandler.execute(async () => {
            this.cycleCount++;
            debug(`Running cycle ${this.cycleCount}...`);
            const result = await this.cycle.runOnce();
            debug(`Cycle ${this.cycleCount} completed.`, result);
            return result;
        }, 'runCycle');
    }

    /**
     * Starts the system's execution cycle.
     * @param {number} [maxCycles=0] - The maximum number of cycles to run. If 0, runs indefinitely.
     */
    async start(maxCycles = 0) {
        await errorHandler.execute(async () => {
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
                    const tickDelay = this.config.getNumber('cycle.TICK_DELAY_MS', 50);
                    await new Promise(resolve => setTimeout(resolve, tickDelay));
                } catch (error) {
                    logError('Fatal error during system cycle execution:', error);
                    this.stop();
                    break;
                }
            }

            if (this.isRunning) {
                this.stop();
            }
        }, 'start');
    }

    /**
     * Stops the system's execution cycle.
     */
    stop() {
        errorHandler.executeSync(() => {
            if (!this.isRunning) return;
            this.isRunning = false;
            this.lm.stopEmbeddingProcessor();
            info(`System stopped after ${this.cycleCount} cycles.`);
        }, 'stop');
    }

    /**
     * Adds new tasks to the system's memory.
     * @param {Array<object>|object} tasks - The task or tasks to add.
     */
    async addTasks(tasks) {
        await errorHandler.execute(async () => {
            const tasksToAdd = normalizeToArray(tasks);
            if (!tasksToAdd.length) return;

            debug(`Adding ${tasksToAdd.length} new tasks to the system...`);
            await this._bootstrapTerms(tasksToAdd);
            this.memory.addTasks(tasksToAdd);
            info(`Successfully added ${tasksToAdd.length} tasks.`);
        }, 'addTasks');
    }

    /**
     * Resets the system to its initial state, clearing memory.
     */
    reset() {
        errorHandler.executeSync(() => {
            this.memory.clear();
            this.cycleCount = 0;
            info('System has been reset.');
        }, 'reset');
    }
}

export default System;
