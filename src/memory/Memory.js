import Term from '../core/Term.js';
import Task from '../core/Task.js';
import EventBus from '../system/EventBus.js';
import {normalizeToArray} from '../utils/collections/index.js';
import {isTask} from '../utils/task-utils.js';
import {consolidateMemory, getHighestPriorityTasksWithPQ} from './memoryUtils.js';
import TimeBasedForgettingStrategy from './strategies/TimeBasedForgettingStrategy.js';
import {debug, warn} from '../utils/logger.js';
import MemoryIndexer from './MemoryIndexer.js';
import ConfigAccessor from '../config/ConfigAccessor.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('Memory');

const FORGETTING_STRATEGIES = {
    TimeBased: TimeBasedForgettingStrategy,
};

class Memory {
    constructor(configManager) {
        this.config = new ConfigAccessor(configManager);
        this.terms = new Map();
        this.shortTermTasks = new Map();
        this.longTermTasks = new Map();
        this.indexer = new MemoryIndexer();
        this.cycleCounter = 0;
        this._cachedAllTasks = null;
        this._loadForgettingStrategy();
        this._registerEventListeners();
    }

    _loadForgettingStrategy() {
        const strategyName = this.config.getString('memory.FORGETTING_STRATEGY_NAME', 'TimeBased');
        const Strategy = FORGETTING_STRATEGIES[strategyName] || TimeBasedForgettingStrategy;
        this.forgettingStrategy = new Strategy();
    }

    _registerEventListeners() {
        EventBus.on('NewTasksCreated', tasks => this.addTasks(tasks));
        EventBus.on('SystemCycleEnded', () => this._performMaintenanceIfNeeded());
    }

    _performMaintenanceIfNeeded() {
        this.cycleCounter++;
        const frequency = this.config.getNumber('memory.MAINTENANCE_CYCLE_FREQUENCY', 10);
        if (this.cycleCounter % frequency === 0) {
            this._consolidateMemory();
            this._pruneMemory();
        }
    }

    _consolidateMemory() {
        const consolidationConfig = {
            memory: {
                CONSOLIDATION_PRIORITY_THRESHOLD: this.config.getNumber('memory.CONSOLIDATION_PRIORITY_THRESHOLD', 0.8),
                CONSOLIDATION_CONFIDENCE_THRESHOLD: this.config.getNumber('memory.CONSOLIDATION_CONFIDENCE_THRESHOLD', 0.9),
            },
        };
        const result = consolidateMemory(this.shortTermTasks, this.longTermTasks, consolidationConfig);
        this.shortTermTasks = result.shortTermTasks;
        this.longTermTasks = result.longTermTasks;
        this._invalidateTaskCache();
    }

    _pruneMemory() {
        if (!this.forgettingStrategy) return;
        const options = this.config.getObject('memory.FORGETTING_STRATEGY_OPTIONS', {});
        this.shortTermTasks = this.forgettingStrategy.prune(this.shortTermTasks, options.shortTerm);
        this.longTermTasks = this.forgettingStrategy.prune(this.longTermTasks, options.longTerm);
        this._invalidateTaskCache();
    }

    _invalidateTaskCache() {
        this._cachedAllTasks = null;
    }

    addTerm(term) {
        // For validation errors, we throw directly to match test expectations
        if (term === null || term === undefined) {
            throw new Error('Can only add valid Term instances to memory');
        }
        if (!(term instanceof Term)) {
            throw new Error('Can only add valid Term instances to memory');
        }

        return errorHandler.safeSync(() => {
            if (this.terms.has(term.key)) {
                debug(`Term '${term.key}' already exists, skipping.`);
                return;
            }
            this.terms.set(term.key, term);
            this.indexer.indexTerm(term);
            debug(`Added term '${term.key}'.`);
        }, 'addTerm');
    }

    getTerm(key) {
        return errorHandler.safeSync(() => {
            if (typeof key !== 'string') {
                warn(`Invalid term key type: ${typeof key}.`);
                return null;
            }
            return this.terms.get(key);
        }, 'getTerm', null);
    }

    getAllTerms() {
        return errorHandler.safeSync(() => [...this.terms.values()], 'getAllTerms', []);
    }

    addTasks(tasks) {
        return errorHandler.safeSync(() => {
            const tasksToAdd = normalizeToArray(tasks);
            if (!tasksToAdd.length) return;

            let addedCount = 0;
            for (const task of tasksToAdd) {
                if (!isTask(task)) {
                    warn(`Skipping invalid task: ${typeof task}`);
                    continue;
                }
                this.shortTermTasks.set(task.id, task);
                this.indexer.indexTask(task);
                addedCount++;
            }

            if (addedCount > 0) {
                this._invalidateTaskCache();
                debug(`Added ${addedCount} tasks.`);
            }
        }, 'addTasks');
    }

    getTask(id) {
        return errorHandler.safeSync(() => this.shortTermTasks.get(id) || this.longTermTasks.get(id), 'getTask', null);
    }

    removeTask(taskId) {
        return errorHandler.safeSync(() => {
            if (!taskId) return;
            const task = this.getTask(taskId);
            if (task) {
                this.shortTermTasks.delete(taskId);
                this.longTermTasks.delete(taskId);
                this.indexer.unindexTask(task);
                this._invalidateTaskCache();
            }
        }, 'removeTask');
    }

    getAllTasks() {
        return errorHandler.safeSync(() => {
            if (!this._cachedAllTasks) {
                this._cachedAllTasks = [...this.shortTermTasks.values(), ...this.longTermTasks.values()];
            }
            return this._cachedAllTasks;
        }, 'getAllTasks', []);
    }

    _shouldUsePriorityQueue(k, totalTasks) {
        const K_THRESHOLD = 50;
        const RATIO_THRESHOLD = 10;
        return k < K_THRESHOLD && k < totalTasks / RATIO_THRESHOLD;
    }

    getHighestPriorityTasks(k = 20) {
        return errorHandler.safeSync(() => {
            if (k <= 0) return [];
            const allTasks = this.getAllTasks();
            return this._shouldUsePriorityQueue(k, allTasks.length) ?
                getHighestPriorityTasksWithPQ(allTasks, k) :
                [...allTasks].sort((a, b) => b.state.priority - a.state.priority).slice(0, k);
        }, 'getHighestPriorityTasks', []);
    }

    clone() {
        return errorHandler.safeSync(() => {
            const newMemory = new Memory(this.config.configManager);
            Object.assign(newMemory, {
                terms: new Map(this.terms),
                shortTermTasks: new Map(this.shortTermTasks),
                longTermTasks: new Map(this.longTermTasks),
                indexer: this.indexer.clone(),
                forgettingStrategy: this.forgettingStrategy,
                cycleCounter: this.cycleCounter,
            });
            return newMemory;
        }, 'clone', null);
    }

    removeTerm(key) {
        return errorHandler.safeSync(() => {
            const term = this.terms.get(key);
            if (!term) return;
            term.destroy?.();
            this.terms.delete(key);
            this.indexer.removeTerm(key);
        }, 'removeTerm');
    }

    clear() {
        return errorHandler.safeSync(() => {
            this.terms.forEach(term => term.destroy?.());
            this.terms.clear();
            this.shortTermTasks.clear();
            this.longTermTasks.clear();
            this.indexer.clear();
            this.cycleCounter = 0;
            this._invalidateTaskCache();
        }, 'clear');
    }

    getStatistics() {
        return errorHandler.safeSync(() => ({
            terms: this.terms.size,
            shortTermTasks: this.shortTermTasks.size,
            longTermTasks: this.longTermTasks.size,
            ...this.indexer.getStatistics(),
        }), 'getStatistics', {});
    }

    getBeliefs() {
        return errorHandler.safeSync(() => this.queryTasks({punctuation: '.'}), 'getBeliefs', []);
    }

    getGoals() {
        return errorHandler.safeSync(() => this.queryTasks({punctuation: '!'}), 'getGoals', []);
    }

    getQuestions() {
        return errorHandler.safeSync(() => this.queryTasks({punctuation: '?'}), 'getQuestions', []);
    }

    getRecentTasks(count = 10) {
        return errorHandler.safeSync(() => {
            const allTasks = this.getAllTasks();
            return [...allTasks]
                .sort((a, b) => Number(b.state.stamp.creationTime) - Number(a.state.stamp.creationTime))
                .slice(0, count);
        }, 'getRecentTasks', []);
    }

    queryTasks(filters = {}) {
        return errorHandler.safeSync(() => this.indexer.queryTasks(this.getAllTasks(), filters), 'queryTasks', []);
    }

    exportState() {
        return errorHandler.safeSync(() => JSON.stringify({
            terms: [...this.terms.values()],
            shortTermTasks: [...this.shortTermTasks.values()],
            longTermTasks: [...this.longTermTasks.values()],
        }, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2), 'exportState', '{}');
    }

    _createTaskFromJSON(json) {
        return errorHandler.safeSync(() => {
            if (!json?.termKey) return null;
            const term = this.getTerm(json.termKey);
            if (!term) return null;
            const deserializedStamp = {...json.state.stamp};
            Object.keys(deserializedStamp).forEach(key => {
                if (typeof deserializedStamp[key] === 'string' && /^\d+n?$/.test(deserializedStamp[key])) {
                    deserializedStamp[key] = BigInt(deserializedStamp[key].replace('n', ''));
                }
            });
            const task = new Task(term, json.punctuation, json.state.truthValue, deserializedStamp);
            task.id = json.id;
            task.state.priority = json.state.priority;
            return task;
        }, '_createTaskFromJSON', null);
    }

    importState(jsonState) {
        // For invalid JSON, we throw directly to match test expectations
        if (typeof jsonState !== 'string') {
            return errorHandler.safeSync(() => {
                this.clear();
            }, 'importState');
        }

        // For invalid JSON, we throw directly to match test expectations
        let state;
        state = JSON.parse(jsonState);

        return errorHandler.safeSync(() => {
            this.clear();
            state.terms?.forEach(termData => {
                const term = Term.fromJSON(termData);
                if (term) this.addTerm(term);
            });
            const processTasks = (tasks, taskMap) => {
                tasks?.forEach(taskData => {
                    const task = this._createTaskFromJSON(taskData);
                    if (task) {
                        taskMap.set(task.id, task);
                        this.indexer.indexTask(task);
                    }
                });
            };
            processTasks(state.shortTermTasks, this.shortTermTasks);
            processTasks(state.longTermTasks, this.longTermTasks);
            this._invalidateTaskCache();
        }, 'importState');
    }
}

export default Memory;
