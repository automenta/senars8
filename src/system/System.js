import '../utils/onnxSuppression.js';
import registerDefaultActions from './default-actions.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';
import {debug, error as logError, info, warn} from '../utils/logger.js';
import {normalizeToArray} from '../utils/arrayUtils.js';
import Introspection from './Introspection.js';

const errorHandler = createModuleErrorHandler('System');

class System {
    constructor(configManager, {
        memory,
        reasoner,
        lm,
        actionExecutor,
        cycle
    }) {
        this.configManager = configManager;
        this.memory = memory;
        this.reasoner = reasoner;
        this.lm = lm;
        this.actionExecutor = actionExecutor;
        this.cycle = cycle;
        this.isRunning = false;
        this.cycleCount = 0;
        this.introspection = new Introspection(this);

        registerDefaultActions(this.actionExecutor);
        info('System components initialized.');
    }

    async initialize(constitutionTasks) {
        await this._withErrorHandling('initialize', async () => {
            info('Initializing with constitution...');
            if (constitutionTasks?.length) {
                this.memory.addTasks(constitutionTasks);
                await this._bootstrapTerms(constitutionTasks, {
                    sync: true
                });
            }
            await this.cycle.bootstrap(constitutionTasks);
            info('Initialized successfully.');
        });
    }

    async _bootstrapTerms(tasks, options = {
        sync: false
    }) {
        await this._withErrorHandling('_bootstrapTerms', async () => {
            const newTermKeys = [...new Set(tasks.map(t => t.termKey).filter(k => !this.memory.getTerm(k)))];
            if (!newTermKeys.length) return;

            debug(`Bootstrapping ${newTermKeys.length} new terms...`);
            const newTerms = (await Promise.all(newTermKeys.map(k => this.lm.bootstrapTerm(k, options)))).filter(Boolean);
            newTerms.forEach(term => this.memory.addTerm(term));
            info(`Bootstrapped ${newTerms.length} terms.`);
        });
    }

    async runCycle() {
        return this._withErrorHandling('runCycle', async () => {
            this.cycleCount++;
            debug(`Running cycle ${this.cycleCount}`);
            const result = await this.cycle.runOnce();
            debug(`Cycle ${this.cycleCount} completed.`, result);
            return result;
        });
    }

    async start(maxCycles = 0) {
        await this._withErrorHandling('start', async () => {
            if (this.isRunning) {
                warn('System is already running.');
                return;
            }
            info(`Starting system with maxCycles: ${maxCycles || 'infinite'}`);
            this.isRunning = true;
            this.cycleCount = 0;
            this.lm.startEmbeddingProcessor();

            while (this.isRunning && (!maxCycles || this.cycleCount < maxCycles)) {
                const result = await this._runCycleWithDelay();
                if (!result?.success) {
                    logError('Fatal error in cycle, stopping system.', result.error);
                    this.stop();
                    break;
                }
            }
            this.stop();
        });
    }

    async _runCycleWithDelay() {
        const result = await this._withErrorHandling('runCycle-in-loop', async () => {
            await this.runCycle();
            const tickDelay = this.configManager.getNumber('cycle.TICK_DELAY_MS', 50);
            if (tickDelay > 0) await new Promise(resolve => setTimeout(resolve, tickDelay));
            return {
                success: true
            };
        });
        return result;
    }

    stop() {
        this._withErrorHandlingSync('stop', () => {
            if (!this.isRunning) return;
            this.isRunning = false;
            this.lm.stopEmbeddingProcessor();
            info(`System stopped after ${this.cycleCount} cycles.`);
        });
    }

    async addTasks(tasks) {
        await this._withErrorHandling('addTasks', async () => {
            const tasksToAdd = normalizeToArray(tasks);
            if (!tasksToAdd.length) return;

            debug(`Adding ${tasksToAdd.length} new tasks...`);
            await this._bootstrapTerms(tasksToAdd);
            this.memory.addTasks(tasksToAdd);
            info(`Added ${tasksToAdd.length} tasks.`);
        });
    }

    async _withErrorHandling(operation, fn) {
        return await errorHandler.safeAsync(fn, operation);
    }

    _withErrorHandlingSync(operation, fn) {
        return errorHandler.safeSync(fn, operation);
    }
}

export default System;
