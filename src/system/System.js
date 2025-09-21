import { createUnifiedErrorHandler } from '../utils/errorHandler.js';
import { debug, error as logError, warn, info } from '../utils/main.js';
import { normalizeToArray } from '../utils/index.js';
import Introspection from './Introspection.js';
import createConfigAccessor from '../config/ConfigAccessor.js';
import registerDefaultActions from './default-actions.js';

const errorHandler = createUnifiedErrorHandler('System');

class System {
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
            info(`Starting system with maxCycles=${maxCycles || 'infinite'}`);
            this.isRunning = true;
            this.cycleCount = 0;
            this.lm.startEmbeddingProcessor();

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
            this.lm.stopEmbeddingProcessor();
            info(`System stopped after ${this.cycleCount} cycles.`);
        }, 'stop');
    }

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

    reset() {
        errorHandler.executeSync(() => {
            this.memory.clear();
            this.cycleCount = 0;
            info('System has been reset.');
        }, 'reset');
    }
}

export default System;
