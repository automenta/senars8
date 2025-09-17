import '../utils/onnxSuppression.js';
import registerDefaultActions from './default-actions.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';
import {debug, error as logError, info, warn} from '../utils/logger.js';
import {normalizeToArray} from '../utils/helpers.js';
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
        info('System components created and initialized.', { module: 'system/System' });
    }

    async initialize(constitutionTasks) {
        await errorHandler.safeAsync(async () => {
            info('System: Initializing with constitution...', { module: 'system/System' });
            if (constitutionTasks?.length > 0) {
                this.memory.addTasks(constitutionTasks);
                await this._bootstrapTerms(constitutionTasks, {
                    sync: true
                });
            }
            await this.cycle.bootstrap(constitutionTasks);
            info('System: Initialized successfully.', { module: 'system/System' });
        }, 'initialize');
    }

    async _bootstrapTerms(tasks, options = {
        sync: false
    }) {
        await errorHandler.safeAsync(async () => {
            const newTermKeys = [...new Set(tasks.map(task => task.termKey).filter(key => !this.memory.getTerm(key)))];
            if (newTermKeys.length === 0) return;

            debug(`Bootstrapping ${newTermKeys.length} new terms...`, { module: 'system/System' });
            const termPromises = newTermKeys.map(key => this.lm.bootstrapTerm(key, options));
            const newTerms = (await Promise.all(termPromises)).filter(Boolean);
            newTerms.forEach(term => this.memory.addTerm(term));
            info(`Successfully bootstrapped ${newTerms.length} terms.`, { module: 'system/System' });
        }, '_bootstrapTerms');
    }

    async runCycle() {
        return await errorHandler.safeAsync(async () => {
            this.cycleCount++;
            debug(`Running cycle ${this.cycleCount}...`, { module: 'system/System' });
            const result = await this.cycle.runOnce();
            debug(`Cycle ${this.cycleCount} completed.`, result);
            return result;
        }, 'runCycle');
    }

    async start(maxCycles = 0) {
        await errorHandler.safeAsync(async () => {
            if (this.isRunning) {
                warn('System is already running.', { module: 'system/System' });
                return;
            }
            info(`Starting system with maxCycles=${maxCycles || 'infinite'}`, { module: 'system/System' });
            this.isRunning = true;
            this.cycleCount = 0;
            this.lm.startEmbeddingProcessor();

            while (this.isRunning && (maxCycles === 0 || this.cycleCount < maxCycles)) {
                const result = await errorHandler.safeAsync(async () => {
                    await this.runCycle();
                    const tickDelay = this.configManager.getNumber('cycle.TICK_DELAY_MS', 50);
                    await new Promise(resolve => setTimeout(resolve, tickDelay));
                    return {success: true};
                }, 'runCycle-in-loop');

                if (!result || !result.success) {
                    logError('Fatal error during system cycle execution:', result.error);
                    this.stop();
                    break;
                }
            }
            this.stop();
        }, 'start');
    }

    stop() {
        errorHandler.safeSync(() => {
            if (!this.isRunning) return;
            this.isRunning = false;
            this.lm.stopEmbeddingProcessor();
            info(`System stopped after ${this.cycleCount} cycles.`, { module: 'system/System' });
        }, 'stop');
    }

    async addTasks(tasks) {
        await errorHandler.safeAsync(async () => {
            const tasksToAdd = normalizeToArray(tasks);
            if (tasksToAdd.length === 0) return;

            debug(`Adding ${tasksToAdd.length} new tasks to the system...`, { module: 'system/System' });
            await this._bootstrapTerms(tasksToAdd);
            this.memory.addTasks(tasksToAdd);
            info(`Successfully added ${tasksToAdd.length} tasks.`, { module: 'system/System' });
        }, 'addTasks');
    }
}

export default System;
