import {systemErrorHandler as errorHandler} from '../utils/errorHandler.js';
import {debug, error as logError, info, warn} from '../utils/logger.js';
import {normalizeToArray} from '../utils/collections/index.js';
import Introspection from './Introspection.js';
import {configService} from '../config/index.js';
import registerDefaultActions from './default-actions.js';
import {SystemEvents} from './SystemEvents.js';
import {SystemCommands} from './SystemCommands.js';

class System {
    constructor(
        configManager,
        memory,
        reasoner,
        actionExecutor,
        cycle,
        planner,
        metaCognition,
        perception,
        eventBus,
        commandBus
    ) {
        this.config = configService;
        this.eventBus = eventBus;
        this.commandBus = commandBus;
        this.memory = memory; // Direct access for now, to be phased out
        this.reasoner = reasoner;
        this.actionExecutor = actionExecutor;
        this.cycle = cycle;
        this.planner = planner;
        this.metaCognition = metaCognition;
        this.perception = perception;
        this.isRunning = false;
        this.cycleCount = 0;
        this.introspection = new Introspection(this);
        this.constitutionTasks = [];

        registerDefaultActions(this.actionExecutor);

        // Register command handlers to control the system
        this.commandBus.handle(SystemCommands.SYSTEM_START_CYCLING, (payload) => this.start(payload?.maxCycles));
        this.commandBus.handle(SystemCommands.SYSTEM_STOP_CYCLING, () => this.stop());
        this.commandBus.handle(SystemCommands.SYSTEM_RESET, () => this.reset());
        this.commandBus.handle(SystemCommands.SYSTEM_ADD_TASKS, (tasks) => this.addTasks(tasks));
        this.commandBus.handle(SystemCommands.SYSTEM_GET_STATS, () => this.getStats());

        info('System components created and initialized.');
    }

    async getStats() {
        const memoryStats = await this.commandBus.request(SystemCommands.MEMORY_GET_STATS);
        const allTasks = await this.commandBus.request(SystemCommands.MEMORY_GET_ALL_TASKS);

        // Count tasks by punctuation in a single pass for better performance
        let beliefs = 0;
        let goals = 0;
        let questions = 0;

        for (const task of allTasks) {
            switch (task.punctuation) {
                case '.':
                    beliefs++;
                    break;
                case '!':
                    goals++;
                    break;
                case '?':
                    questions++;
                    break;
            }
        }

        return {
            cycleCount: this.cycleCount,
            memoryUsage: memoryStats.terms + memoryStats.shortTermTasks + memoryStats.longTermTasks,
            beliefs,
            goals,
            questions,
            tasks: allTasks.length,
        };
    }

    async initialize(constitutionTasks) {
        await errorHandler.execute(async () => {
            info('System: Initializing with constitution...');
            this.constitutionTasks = constitutionTasks || [];
            if (this.constitutionTasks.length > 0) {
                await this.addTasks(this.constitutionTasks);
            }
            await this.cycle.bootstrap(this.constitutionTasks);
            info('System: Initialized successfully.');
        }, 'initialize');
    }

    async _bootstrapTerms(tasks, options = {
        sync: false
    }) {
        await errorHandler.execute(async () => {
            // Use Set to deduplicate term keys efficiently
            const termKeySet = new Set();
            for (const task of tasks) {
                termKeySet.add(task.termKey);
            }
            const termKeys = Array.from(termKeySet);

            if (termKeys.length === 0) return;

            // Optimize the term existence check - batch the requests more efficiently
            const termExistence = await Promise.allSettled(
                termKeys.map(key => this.commandBus.request(SystemCommands.MEMORY_GET_TERM, key))
            );

            // Build new term keys array for non-existent terms
            const newTermKeys = [];
            for (let i = 0; i < termKeys.length; i++) {
                const result = termExistence[i];
                if (result.status === 'fulfilled' && !result.value) {
                    newTermKeys.push(termKeys[i]);
                } else if (result.status === 'rejected') {
                    // If there was an error checking existence, still try to bootstrap
                    newTermKeys.push(termKeys[i]);
                }
            }

            if (newTermKeys.length === 0) return;

            debug(`Bootstrapping ${newTermKeys.length} new terms...`);
            const bootstrapPromises = newTermKeys.map(key => this.commandBus.request(SystemCommands.LM_BOOTSTRAP_TERM, {
                termKey: key,
                options
            }));

            const bootstrapResults = await Promise.allSettled(bootstrapPromises);
            const newTerms = [];

            for (const result of bootstrapResults) {
                if (result.status === 'fulfilled' && result.value) {
                    newTerms.push(result.value);
                }
            }

            await this.eventBus.emitAsync(SystemEvents.TERM_ADD, newTerms);
            info(`Successfully bootstrapped ${newTerms.length} terms.`);
        }, '_bootstrapTerms');
    }


    async runCycle() {
        return await errorHandler.execute(async () => {
            this.cycleCount++;
            debug(`Running cycle ${this.cycleCount}...`);
            const result = await this.cycle.runOnce();
            debug(`Cycle ${this.cycleCount} completed.`, result);
            return result;
        }, 'runCycle');
    }

    async start(maxCycles = 0) {
        await errorHandler.execute(async () => {
            if (this.isRunning) {
                warn('System is already running.');
                return;
            }
            info(`Starting system with maxCycles=${maxCycles === 0 ? 'infinite' : maxCycles}`);
            this.isRunning = true;
            this.cycleCount = 0;
            this.eventBus.emit(SystemEvents.SYSTEM_START);

            while (this.isRunning && (maxCycles === 0 || this.cycleCount < maxCycles)) {
                const result = await errorHandler.execute(async () => {
                    await this.runCycle();
                    const tickDelay = this.config.getNumber('cycle.TICK_DELAY_MS', 50);
                    await new Promise(resolve => setTimeout(resolve, tickDelay));
                    return {
                        success: true
                    };
                }, 'runCycle-in-loop');

                if (!result?.success) {
                    logError('Fatal error during system cycle execution:', result.error);
                    this.stop();
                    break;
                }
            }
            this.stop();
        }, 'start');
    }

    stop() {
        errorHandler.executeSync(() => {
            if (!this.isRunning) return;
            this.isRunning = false;
            this.eventBus.emit(SystemEvents.SYSTEM_STOP);
            info(`System stopped after ${this.cycleCount} cycles.`);
        }, 'stop');
    }

    async addTasks(tasks) {
        await errorHandler.execute(async () => {
            const tasksToAdd = normalizeToArray(tasks);
            if (!tasksToAdd.length) return;

            debug(`Adding ${tasksToAdd.length} new tasks to the system...`);
            await this._bootstrapTerms(tasksToAdd);
            await this.eventBus.emitAsync(SystemEvents.TASKS_ADD, tasksToAdd);
            info(`Successfully added ${tasksToAdd.length} tasks.`);
        }, 'addTasks');
    }

    async reset() {
        await errorHandler.execute(async () => {
            await this.eventBus.emitAsync(SystemEvents.SYSTEM_RESET);
            this.cycleCount = 0;
            await this.initialize(this.constitutionTasks);
            info('System has been reset and re-initialized with constitution.');
        }, 'reset');
    }
}

export default System;
