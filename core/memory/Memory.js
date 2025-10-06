import {MinPriorityQueue} from '@datastructures-js/priority-queue';
import Term from '../core/Term.js';
import Task from '../core/Task.js';
import {normalizeToArray} from '../utils/collections/index.js';
import {isTask} from '../utils/task-utils.js';
import TimeBasedForgettingStrategy from './strategies/TimeBasedForgettingStrategy.js';
import {debug, warn} from '../utils/logger.js';
import MemoryIndexer from './MemoryIndexer.js';
import {createError} from '../utils/errorHandler.js';
import {wrapAsync} from '../utils/asyncWrapper.js';
import {SystemEvents} from '../system/SystemEvents.js';
import {SystemCommands} from '../system/SystemCommands.js';
import Bag from '../utils/bag.js';

const FORGETTING_STRATEGIES = {
    TimeBased: TimeBasedForgettingStrategy,
};

class Memory {
    constructor(configManager, eventBus, commandBus) {
        this.config = configManager;
        this.eventBus = eventBus;
        this.commandBus = commandBus;
        this.terms = new Map();
        this.shortTermTasks = new Map();
        this.longTermTasks = new Map();
        this.indexer = new MemoryIndexer();
        this.cycleCounter = 0;
        this._cachedAllTasks = null;
        this._accessCounter = 0;
        this._lastMaintenanceTime = Date.now();
        this._memoryPressureHistory = [];
        this._accessPatternHistory = [];
        this._queryCache = new Map();
        this._punctuationCache = new Map();
        this._recentTasksCache = new Map();
        this._semanticCache = new Map();
        this._termRelationshipCache = new Map();
        
        // Embedding store for semantic similarity calculations
        this.embeddingStore = new Map();

        // Bag-based collections for capacity-limited prioritized task management
        this._focusSetBag = new Bag(this.config.getNumber('FOCUS_SET_SIZE', 20));
        this._recentTasksBag = new Bag(this.config.getNumber('RECENT_TASKS_CACHE_SIZE', 50));
        this._priorityTasksBag = new Bag(this.config.getNumber('PRIORITY_TASKS_BAG_SIZE', 100));
        this._semanticTasksBag = new Bag(this.config.getNumber('SEMANTIC_TASKS_BAG_SIZE', 30));

        this._loadForgettingStrategy();
        this._registerEventListeners();
        this._registerCommandHandlers();

        // Track recently logged invalid task warnings to reduce noise
        this._recentInvalidTaskWarnings = new Map();
        this._invalidTaskWarningTimeout = 30000; // 30 seconds

        // Cache performance tracking
        this._cacheStats = {
            queryHits: 0,
            queryMisses: 0,
            punctuationHits: 0,
            punctuationMisses: 0,
            recentHits: 0,
            recentMisses: 0,
            semanticHits: 0,
            semanticMisses: 0,
            termRelationshipHits: 0,
            termRelationshipMisses: 0
        };

        this.addTerm = wrapAsync(this._addTerm.bind(this), 'Memory', 'addTerm', {rethrow: true});
        this.addTask = wrapAsync(this._addTask.bind(this), 'Memory', 'addTask');
        this.addTasks = wrapAsync(this._addTasks.bind(this), 'Memory', 'addTasks');
        this.removeTask = wrapAsync(this._removeTask.bind(this), 'Memory', 'removeTask');
        this.getAllTasks = wrapAsync(this._getAllTasks.bind(this), 'Memory', 'getAllTasks', {defaultValue: []});
        this.getHighestPriorityTasks = wrapAsync(this._getHighestPriorityTasks.bind(this), 'Memory', 'getHighestPriorityTasks', {defaultValue: []});
        this.clone = wrapAsync(this._clone.bind(this), 'Memory', 'clone', {defaultValue: null});
        this.removeTerm = wrapAsync(this._removeTerm.bind(this), 'Memory', 'removeTerm');
        this.clear = wrapAsync(this._clear.bind(this), 'Memory', 'clear');
        this.getStatistics = wrapAsync(this._getStatistics.bind(this), 'Memory', 'getStatistics', {defaultValue: {}});
        this.getBeliefs = wrapAsync(this._getTasksByPunctuation.bind(this, '.'), 'Memory', 'getBeliefs', {defaultValue: []});
        this.getGoals = wrapAsync(this._getTasksByPunctuation.bind(this, '!'), 'Memory', 'getGoals', {defaultValue: []});
        this.getQuestions = wrapAsync(this._getTasksByPunctuation.bind(this, '?'), 'Memory', 'getQuestions', {defaultValue: []});
        this.getRecentTasks = wrapAsync(this._getRecentTasks.bind(this), 'Memory', 'getRecentTasks', {defaultValue: []});
        this.queryTasks = wrapAsync(this._queryTasks.bind(this), 'Memory', 'queryTasks', {defaultValue: []});
        this.getTasksByPunctuation = wrapAsync(this._getTasksByPunctuation.bind(this), 'Memory', 'getTasksByPunctuation', {defaultValue: []});
        this.exportState = wrapAsync(this._exportState.bind(this), 'Memory', 'exportState', {defaultValue: '{}'});
        this.importState = wrapAsync(this._importState.bind(this), 'Memory', 'importState', {rethrow: true});
    }

    _loadForgettingStrategy() {
        const strategyName = this.config.getString('memory.FORGETTING_STRATEGY_NAME', 'TimeBased');
        const Strategy = FORGETTING_STRATEGIES[strategyName] || TimeBasedForgettingStrategy;
        this.forgettingStrategy = new Strategy();
    }

    _registerEventListeners() {
        this.eventBus.on(SystemEvents.TASKS_ADD, async (tasks) => await this.addTasks(tasks));
        this.eventBus.on(SystemEvents.CYCLE_COMPLETE, () => this._performMaintenanceIfNeeded());
        this.eventBus.on(SystemEvents.TERM_ADD, async (terms) => await this._addTermsFromEvent(terms));
        this.eventBus.on(SystemEvents.SYSTEM_RESET, async () => await this.clear());
    }

    async _addTermsFromEvent(terms) {
        const termsToAdd = normalizeToArray(terms);
        for (const term of termsToAdd) {
            await this.addTerm(term);
        }
    }

    _registerCommandHandlers() {
        this.commandBus.handle(SystemCommands.MEMORY_GET_TASK, async (id) => this.getTask(id));
        this.commandBus.handle(SystemCommands.MEMORY_GET_TERM, async (key) => this.getTerm(key));
        this.commandBus.handle(SystemCommands.MEMORY_GET_ALL_TASKS, async () => this.getAllTasks());
        this.commandBus.handle(SystemCommands.MEMORY_GET_ALL_TERMS, async () => this.getAllTerms());
        this.commandBus.handle(SystemCommands.MEMORY_GET_HIGHEST_PRIORITY_TASKS, async (k) => this.getHighestPriorityTasks(k));
        this.commandBus.handle(SystemCommands.MEMORY_GET_STATS, async () => this.getStatistics());
    }

    _performMaintenanceIfNeeded() {
        if (this._shouldPerformMaintenance()) {
            this._consolidateMemory();
            this._pruneMemory();
            this._lastMaintenanceTime = Date.now();
        }
    }

    _shouldPerformMaintenance() {
        this.cycleCounter++;
        this._accessCounter++;

        // Always perform maintenance if basic cycle threshold is reached
        const baseFrequency = this.config.getNumber('memory.MAINTENANCE_CYCLE_FREQUENCY', 10);
        if (this.cycleCounter % baseFrequency === 0) {
            return true;
        }

        // Check if intelligent scheduling indicates maintenance is needed
        return this._shouldPerformIntelligentMaintenance();
    }

    _shouldPerformIntelligentMaintenance() {
        const now = Date.now();
        const timeSinceLastMaintenance = now - this._lastMaintenanceTime;

        // Update access patterns and memory pressure history
        this._updateAccessPatterns();
        this._updateMemoryPressure();

        // Don't perform maintenance too frequently
        const minInterval = this.config.getNumber('memory.MAINTENANCE_MIN_INTERVAL_MS', 5000);
        if (timeSinceLastMaintenance < minInterval) {
            return false;
        }

        // Calculate adaptive maintenance score based on multiple factors
        const maintenanceScore = this._calculateMaintenanceScore();

        // Perform maintenance if score exceeds threshold
        const adaptiveThreshold = this.config.getNumber('memory.MAINTENANCE_ADAPTIVE_THRESHOLD', 0.7);
        return maintenanceScore >= adaptiveThreshold;
    }

    _updateAccessPatterns() {
        // Track access frequency over time windows
        const now = Date.now();
        this._accessPatternHistory.push({
            timestamp: now,
            accessCount: this._accessCounter
        });

        // Keep only last 10 data points
        if (this._accessPatternHistory.length > 10) {
            this._accessPatternHistory.shift();
        }
    }

    _updateMemoryPressure() {
        const totalTasks = this.shortTermTasks.size + this.longTermTasks.size;
        const totalTerms = this.terms.size;

        // Calculate memory pressure based on task/term ratios and cache performance
        const taskTermRatio = totalTerms > 0 ? totalTasks / totalTerms : 0;
        const cacheHitRate = this._calculateOverallCacheHitRate();

        const memoryPressure = Math.min(1.0, (taskTermRatio * 0.4) + ((1 - cacheHitRate) * 0.6));

        this._memoryPressureHistory.push({
            timestamp: Date.now(),
            pressure: memoryPressure
        });

        // Keep only last 10 data points
        if (this._memoryPressureHistory.length > 10) {
            this._memoryPressureHistory.shift();
        }
    }

    _calculateOverallCacheHitRate() {
        const totalRequests = (this._cacheStats.queryHits + this._cacheStats.queryMisses +
                              this._cacheStats.punctuationHits + this._cacheStats.punctuationMisses +
                              this._cacheStats.recentHits + this._cacheStats.recentMisses +
                              this._cacheStats.semanticHits + this._cacheStats.semanticMisses +
                              this._cacheStats.termRelationshipHits + this._cacheStats.termRelationshipMisses);

        if (totalRequests === 0) return 1.0;

        const totalHits = this._cacheStats.queryHits + this._cacheStats.punctuationHits +
                         this._cacheStats.recentHits + this._cacheStats.semanticHits + this._cacheStats.termRelationshipHits;

        return totalHits / totalRequests;
    }

    _calculateMaintenanceScore() {
        let score = 0;
        let factors = 0;

        // Factor 1: Memory pressure (0-0.4 weight)
        if (this._memoryPressureHistory.length > 0) {
            const recentPressure = this._memoryPressureHistory[this._memoryPressureHistory.length - 1].pressure;
            score += recentPressure * 0.4;
            factors += 0.4;
        }

        // Factor 2: Access pattern trend (0-0.3 weight)
        if (this._accessPatternHistory.length >= 2) {
            const recent = this._accessPatternHistory.slice(-1)[0];
            const previous = this._accessPatternHistory.slice(-2)[0];
            const accessTrend = (recent.accessCount - previous.accessCount) / Math.max(previous.accessCount, 1);

            // Higher access trend suggests more maintenance needed
            score += Math.min(accessTrend, 1.0) * 0.3;
            factors += 0.3;
        }

        // Factor 3: Cache performance degradation (0-0.3 weight)
        const cacheHitRate = this._calculateOverallCacheHitRate();
        const cacheDegradation = 1 - cacheHitRate;
        score += cacheDegradation * 0.3;
        factors += 0.3;

        return factors > 0 ? score / factors : 0;
    }

    _consolidateMemory() {
        const {priorityThreshold, confidenceThreshold} = this._getConsolidationThresholds();

        const [newShortTermTasks, newLongTermTasks] = this._partitionTasksByThreshold(
            priorityThreshold,
            confidenceThreshold
        );

        this._updateTaskMaps(newShortTermTasks, newLongTermTasks);
        this._invalidateCachedTasks();
    }

    _getConsolidationThresholds() {
        return {
            priorityThreshold: this.config.getNumber('memory.CONSOLIDATION_PRIORITY_THRESHOLD', 0.8),
            confidenceThreshold: this.config.getNumber('memory.CONSOLIDATION_CONFIDENCE_THRESHOLD', 0.9)
        };
    }

    _partitionTasksByThreshold(priorityThreshold, confidenceThreshold) {
        const newShortTermTasks = new Map();
        const newLongTermTasks = new Map(this.longTermTasks);

        for (const [taskId, task] of this.shortTermTasks.entries()) {
            (task.state.priority >= priorityThreshold || task.state.truthValue.confidence >= confidenceThreshold)
                ? newLongTermTasks.set(taskId, task)
                : newShortTermTasks.set(taskId, task);
        }

        return [newShortTermTasks, newLongTermTasks];
    }

    _updateTaskMaps(shortTermTasks, longTermTasks) {
        this.shortTermTasks = shortTermTasks;
        this.longTermTasks = longTermTasks;
    }

    _pruneMemory() {
        if (!this.forgettingStrategy) return;

        const {shortTermTasks, longTermTasks} = this._applyForgettingStrategy();
        this.shortTermTasks = shortTermTasks;
        this.longTermTasks = longTermTasks;
        this._invalidateCachedTasks();
    }

    _applyForgettingStrategy() {
        const options = this.config.getObject('memory.FORGETTING_STRATEGY_OPTIONS', {});
        return {
            shortTermTasks: this.forgettingStrategy.prune(this.shortTermTasks, options.shortTerm),
            longTermTasks: this.forgettingStrategy.prune(this.longTermTasks, options.longTerm)
        };
    }

    // Old function removed - replaced with _invalidateCachedTasks()

    async _addTerm(term) {
        this._validateTerm(term);
        if (this.terms.has(term.key)) {
            debug(`Term '${term.key}' already exists, skipping.`);
            return;
        }

        this._storeTerm(term);
        if (this.eventBus && typeof this.eventBus.emitAsync === 'function') {
            await this.eventBus.emitAsync(SystemEvents.TERM_ADD, term);
        }
        debug(`Added term '${term.key}'.`);
    }

    _validateTerm(term) {
        if (term === null || term === undefined || !(term instanceof Term)) {
            throw createError.ValidationError('Can only add valid Term instances to memory');
        }
    }

    _storeTerm(term) {
        this.terms.set(term.key, term);
        this.indexer.indexTerm(term);
    }

    getTerm(key) {
        if (typeof key !== 'string' || !key || key.trim() === '') {
            return null; // Return null instead of warning for invalid keys, since this is expected behavior in some cases
        }
        return this.terms.get(key);
    }

    getAllTerms() {
        return [...this.terms.values()];
    }

    async _addTask(task) {
        return await this._addTasks([task]);
    }

    async _addTasks(tasks) {
        const tasksToAdd = normalizeToArray(tasks);
        if (!tasksToAdd.length) return;

        const validTasks = this._filterValidTasks(tasksToAdd);
        if (!validTasks.length) return;

        await this._processValidTasks(validTasks);
    }

    _filterValidTasks(tasks) {
        const validTasks = [];
        const now = Date.now();

        for (const task of tasks) {
            if (this._isValidTask(task)) {
                validTasks.push(task);
            } else {
                this._handleInvalidTask(task, now);
            }
        }

        return validTasks;
    }

    _isValidTask(task) {
        return isTask(task);
    }

    _handleInvalidTask(task, now) {
        if (task == null) return;

        const taskSignature = this._getInvalidTaskSignature(task);
        const lastWarning = this._recentInvalidTaskWarnings.get(taskSignature);

        if (lastWarning && now - lastWarning <= this._invalidTaskWarningTimeout) return;

        const taskInfo = this._formatInvalidTaskInfo(task);
        warn(`Skipping invalid task: ${taskInfo}`);
        this._recentInvalidTaskWarnings.set(taskSignature, now);
        this._cleanupOldInvalidTaskWarnings(now);
    }

    _formatInvalidTaskInfo(task) {
        let taskInfo = typeof task;
        if (task && typeof task === 'object') {
            const relevantProps = [];
            if (task.hasOwnProperty('termKey')) relevantProps.push(`termKey:${task.termKey}`);
            if (task.hasOwnProperty('punctuation')) relevantProps.push(`punct:${task.punctuation}`);
            if (task.hasOwnProperty('id')) relevantProps.push(`id:${task.id}`);
            if (task.hasOwnProperty('type')) relevantProps.push(`type:${task.type}`);

            if (relevantProps.length > 0) {
                taskInfo += ` {${relevantProps.join(', ')}}`;
            } else {
                taskInfo += ` with ${Object.keys(task).length} properties`;
            }
        }
        return taskInfo;
    }

    async _processValidTasks(tasks) {
        for (const task of tasks) {
            this._storeTask(task);
            if (this.eventBus && typeof this.eventBus.emitAsync === 'function') {
            await this.eventBus.emitAsync(SystemEvents.TASK_ADD, task);
        }
        }

        this._finalizeTaskProcessing(tasks.length);
    }

    _storeTask(task) {
        this.shortTermTasks.set(task.id, task);
        this.indexer.indexTask(task);
    }

    _finalizeTaskProcessing(count) {
        this._invalidateCachedTasks();
        this._updateBagCollections();
        debug(`Added ${count} tasks.`);
    }

    _updateBagCollections() {
        const allTasks = this._collectAllTasks();

        // Update priority tasks bag with current tasks
        this._priorityTasksBag.clear();
        for (const task of allTasks) {
            this._priorityTasksBag.put(task, task.state.priority);
        }

        // Update recent tasks bag
        this._recentTasksBag.clear();
        for (const task of allTasks) {
            this._recentTasksBag.put(task, Number(task.state.stamp.creationTime));
        }
    }

    /**
     * Get tasks using Bag-based statistical sampling for fair priority selection
     * @param {number} count - Number of tasks to sample
     * @returns {Array} - Array of sampled tasks
     */
    getTasksByBagSampling(count = 20) {
        if (count <= 0) return [];

        // Use priority bag for statistical sampling
        const sampledTasks = this._priorityTasksBag.sampleMultipleUnique(count);

        // Sort by priority for consistent ordering
        return sampledTasks.sort((a, b) => b.state.priority - a.state.priority);
    }

    /**
     * Get recent tasks using Bag-based sampling
     * @param {number} count - Number of tasks to sample
     * @returns {Array} - Array of sampled recent tasks
     */
    getRecentTasksByBagSampling(count = 10) {
        if (count <= 0) return [];

        // Use recent tasks bag for statistical sampling
        const sampledTasks = this._recentTasksBag.sampleMultipleUnique(count);

        // Sort by creation time for consistent ordering
        return sampledTasks.sort((a, b) => Number(b.state.stamp.creationTime) - Number(a.state.stamp.creationTime));
    }

    /**
     * Add task to semantic bag for semantic similarity-based collections
     * @param {Task} task - Task to add
     * @param {number} semanticScore - Semantic similarity score
     */
    addTaskToSemanticBag(task, semanticScore = 0.5) {
        this._semanticTasksBag.put(task, semanticScore);
    }

    /**
     * Get semantically similar tasks using Bag-based sampling
     * @param {number} count - Number of tasks to sample
     * @returns {Array} - Array of semantically sampled tasks
     */
    getSemanticTasksByBagSampling(count = 5) {
        if (count <= 0) return [];

        const sampledTasks = this._semanticTasksBag.sampleMultipleUnique(count);
        return sampledTasks.sort((a, b) => b.state.priority - a.state.priority);
    }

    _getInvalidTaskSignature(task) {
        // Create a signature that identifies the "type" of invalid task
        if (task && typeof task === 'object') {
            // Include key properties that would identify the source/type of object
            const keys = Object.keys(task).sort();
            return `obj_${keys.length}_${JSON.stringify(keys)}`;
        }
        return `prim_${typeof task}`;
    }

    _cleanupOldInvalidTaskWarnings(now) {
        // Run cleanup when we have many entries to prevent memory issues
        if (this._recentInvalidTaskWarnings.size > 100) { // If we have many entries
            const cutoff = now - (this._invalidTaskWarningTimeout * 2); // 2x timeout
            for (const [signature, timestamp] of this._recentInvalidTaskWarnings.entries()) {
                if (timestamp < cutoff) {
                    this._recentInvalidTaskWarnings.delete(signature);
                }
            }
        }
    }

    getTask(id) {
        return this.shortTermTasks.get(id) || this.longTermTasks.get(id);
    }

    async _removeTask(taskId) {
        if (!taskId) return;
        const task = this.getTask(taskId);
        if (task) {
            this.shortTermTasks.delete(taskId);
            this.longTermTasks.delete(taskId);
            this.indexer.unindexTask(task);
            this._invalidateCachedTasks();
            if (this.eventBus && typeof this.eventBus.emitAsync === 'function') {
            await this.eventBus.emitAsync(SystemEvents.TASK_REMOVE, task);
        }
        }
    }

    _getAllTasks() {
        if (!this._cachedAllTasks) {
            this._cachedAllTasks = [];
            this._updateCachedTasks();
        }
        return this._cachedAllTasks;
    }

    _updateCachedTasks() {
        this._cachedAllTasks = this._collectAllTasks();
    }

    _collectAllTasks() {
        // Pre-calculate sizes to avoid repeated Map.size calls
        const shortTermSize = this.shortTermTasks.size;
        const longTermSize = this.longTermTasks.size;
        const totalCount = shortTermSize + longTermSize;

        // Single allocation for better memory layout
        const result = new Array(totalCount);

        // Use more efficient iteration patterns
        let index = 0;

        // Copy short-term tasks first (more likely to be accessed)
        const shortTermValues = Array.from(this.shortTermTasks.values());
        for (let i = 0; i < shortTermSize; i++) {
            result[index++] = shortTermValues[i];
        }

        // Copy long-term tasks
        const longTermValues = Array.from(this.longTermTasks.values());
        for (let i = 0; i < longTermSize; i++) {
            result[index++] = longTermValues[i];
        }

        return result;
    }

    _invalidateCachedTasks() {
        this._cachedAllTasks = null;
        this._clearQueryCache();
        this._clearPunctuationCache();
        this._clearRecentTasksCache();
        this._clearSemanticCache();
        this._clearTermRelationshipCache();
    }

    _getCacheKey(type, params) {
        return `${type}:${JSON.stringify(params)}`;
    }

    _getCachedQuery(filters) {
        const key = this._getCacheKey('query', filters);
        const cached = this._queryCache.get(key);
        if (cached && (Date.now() - cached.timestamp) < 5000) { // 5 second cache
            this._cacheStats.queryHits++;
            return cached.result;
        }
        this._cacheStats.queryMisses++;
        return null;
    }

    _setCachedQuery(filters, result) {
        const key = this._getCacheKey('query', filters);
        // Implement LRU-style cache size management
        if (this._queryCache.size >= 100) {
            const firstKey = this._queryCache.keys().next().value;
            this._queryCache.delete(firstKey);
        }
        this._queryCache.set(key, {
            result,
            timestamp: Date.now()
        });
    }

    _getCachedPunctuation(punctuation) {
        const key = this._getCacheKey('punctuation', {punctuation});
        const cached = this._punctuationCache.get(key);
        if (cached && (Date.now() - cached.timestamp) < 3000) { // 3 second cache
            this._cacheStats.punctuationHits++;
            return cached.result;
        }
        this._cacheStats.punctuationMisses++;
        return null;
    }

    _setCachedPunctuation(punctuation, result) {
        const key = this._getCacheKey('punctuation', {punctuation});
        if (this._punctuationCache.size >= 50) {
            const firstKey = this._punctuationCache.keys().next().value;
            this._punctuationCache.delete(firstKey);
        }
        this._punctuationCache.set(key, {
            result,
            timestamp: Date.now()
        });
    }

    _getCachedRecentTasks(count) {
        const key = this._getCacheKey('recent', {count});
        const cached = this._recentTasksCache.get(key);
        if (cached && (Date.now() - cached.timestamp) < 2000) { // 2 second cache
            this._cacheStats.recentHits++;
            return cached.result;
        }
        this._cacheStats.recentMisses++;
        return null;
    }

    _setCachedRecentTasks(count, result) {
        const key = this._getCacheKey('recent', {count});
        if (this._recentTasksCache.size >= 20) {
            const firstKey = this._recentTasksCache.keys().next().value;
            this._recentTasksCache.delete(firstKey);
        }
        this._recentTasksCache.set(key, {
            result,
            timestamp: Date.now()
        });
    }

    _clearQueryCache() {
        this._queryCache.clear();
    }

    _clearPunctuationCache() {
        this._punctuationCache.clear();
    }

    _clearRecentTasksCache() {
        this._recentTasksCache.clear();
    }

    _clearSemanticCache() {
        this._semanticCache.clear();
    }

    _clearTermRelationshipCache() {
        this._termRelationshipCache.clear();
    }

    _getCachedTermRelationships(termKey, threshold, limit) {
        const key = this._getCacheKey('termrel', {termKey, threshold, limit});
        const cached = this._termRelationshipCache.get(key);
        if (cached && (Date.now() - cached.timestamp) < 15000) { // 15 second cache for term relationships
            this._cacheStats.termRelationshipHits++;
            return cached.result;
        }
        this._cacheStats.termRelationshipMisses++;
        return null;
    }

    _setCachedTermRelationships(termKey, threshold, limit, result) {
        const key = this._getCacheKey('termrel', {termKey, threshold, limit});
        if (this._termRelationshipCache.size >= 40) {
            const firstKey = this._termRelationshipCache.keys().next().value;
            this._termRelationshipCache.delete(firstKey);
        }
        this._termRelationshipCache.set(key, {
            result,
            timestamp: Date.now()
        });
    }

    async findRelatedTerms(termKey, threshold = 0.8, limit = 5) {
        if (!termKey) return [];

        // Check cache first
        const cached = this._getCachedTermRelationships(termKey, threshold, limit);
        if (cached) return cached;

        const queryEmbedding = this.embeddingStore.get(termKey);
        if (!queryEmbedding) return [];

        const relatedTerms = [];
        const allTerms = this.getAllTerms();

        for (const term of allTerms) {
            if (term.key === termKey) continue; // Skip the query term itself

            const termEmbedding = this.embeddingStore.get(term.key);
            if (termEmbedding) {
                const similarity = this._calculateCosineSimilarity(queryEmbedding, termEmbedding);
                if (similarity >= threshold) {
                    relatedTerms.push({
                        term,
                        similarity
                    });
                }
            }
        }

        // Sort by similarity and limit results
        relatedTerms.sort((a, b) => b.similarity - a.similarity);
        const result = relatedTerms.slice(0, limit).map(item => item.term);

        this._setCachedTermRelationships(termKey, threshold, limit, result);
        return result;
    }

    async getTermSemanticContext(termKey, contextSize = 3) {
        if (!termKey) return [];

        const relatedTerms = await this.findRelatedTerms(termKey, 0.7, contextSize * 2);
        return relatedTerms.slice(0, contextSize);
    }

    _getCachedSemantic(queryEmbedding, threshold, limit) {
        const key = this._getCacheKey('semantic', {threshold, limit, embeddingHash: this._hashEmbedding(queryEmbedding)});
        const cached = this._semanticCache.get(key);
        if (cached && (Date.now() - cached.timestamp) < 10000) { // 10 second cache for semantic search
            this._cacheStats.semanticHits++;
            return cached.result;
        }
        this._cacheStats.semanticMisses++;
        return null;
    }

    _setCachedSemantic(queryEmbedding, threshold, limit, result) {
        const key = this._getCacheKey('semantic', {threshold, limit, embeddingHash: this._hashEmbedding(queryEmbedding)});
        if (this._semanticCache.size >= 30) {
            const firstKey = this._semanticCache.keys().next().value;
            this._semanticCache.delete(firstKey);
        }
        this._semanticCache.set(key, {
            result,
            timestamp: Date.now()
        });
    }

    _hashEmbedding(embedding) {
        if (!Array.isArray(embedding)) return 'null';
        // Simple hash for cache key - sum first 10 elements
        let hash = 0;
        const len = Math.min(embedding.length, 10);
        for (let i = 0; i < len; i++) {
            hash = ((hash << 5) - hash) + embedding[i];
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    _calculateCosineSimilarity(embedding1, embedding2) {
        if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
            return 0;
        }

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
        }

        if (norm1 === 0 || norm2 === 0) return 0;

        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    async findSimilarTasks(queryTask, threshold = 0.7, limit = 10) {
        if (!queryTask || !queryTask.termKey) return [];

        // Get embedding for the query task's term
        const queryEmbedding = this.embeddingStore.get(queryTask.termKey);
        if (!queryEmbedding) return [];

        // Check cache first
        const cached = this._getCachedSemantic(queryEmbedding, threshold, limit);
        if (cached) return cached;

        const allTasks = await this.getAllTasks();
        const similarTasks = [];

        for (const task of allTasks) {
            if (task.id === queryTask.id) continue; // Skip the query task itself

            const taskEmbedding = this.embeddingStore.get(task.termKey);
            if (taskEmbedding) {
                const similarity = this._calculateCosineSimilarity(queryEmbedding, taskEmbedding);
                if (similarity >= threshold) {
                    similarTasks.push({
                        task,
                        similarity
                    });
                }
            }
        }

        // Sort by similarity and limit results
        similarTasks.sort((a, b) => b.similarity - a.similarity);
        const result = similarTasks.slice(0, limit).map(item => item.task);

        this._setCachedSemantic(queryEmbedding, threshold, limit, result);
        return result;
    }

    async findTasksBySemanticQuery(queryTermKey, threshold = 0.7, limit = 10) {
        if (!queryTermKey) return [];

        const queryEmbedding = embeddingStore.get(queryTermKey);
        if (!queryEmbedding) return [];

        // Check cache first
        const cached = this._getCachedSemantic(queryEmbedding, threshold, limit);
        if (cached) return cached;

        const allTasks = await this.getAllTasks();
        const similarTasks = [];

        for (const task of allTasks) {
            const taskEmbedding = this.embeddingStore.get(task.termKey);
            if (taskEmbedding) {
                const similarity = this._calculateCosineSimilarity(queryEmbedding, taskEmbedding);
                if (similarity >= threshold) {
                    similarTasks.push({
                        task,
                        similarity
                    });
                }
            }
        }

        // Sort by similarity and limit results
        similarTasks.sort((a, b) => b.similarity - a.similarity);
        const result = similarTasks.slice(0, limit).map(item => item.task);

        this._setCachedSemantic(queryEmbedding, threshold, limit, result);
        return result;
    }

    _shouldUsePriorityQueue(k, totalTasks) {
        // More aggressive threshold for better performance
        const K_THRESHOLD = 100;
        const RATIO_THRESHOLD = 8;
        return k < K_THRESHOLD && k * RATIO_THRESHOLD < totalTasks;
    }

    _getHighestPriorityTasksWithPQ(tasks, k) {
        if (k <= 0) return [];

        // Use Bag for statistical priority sampling instead of strict priority queue
        const bag = new Bag(k);

        // Add all tasks to bag - this provides fair priority-based sampling
        for (const task of tasks) {
            bag.put(task, task.state.priority);
        }

        // Sample k items using statistical priority sampling
        const sampledTasks = bag.sampleMultipleUnique(k);

        // Sort sampled tasks by priority for consistent ordering
        return sampledTasks.sort((a, b) => b.state.priority - a.state.priority);
    }


    async _getHighestPriorityTasks(k = 20) {
        if (k <= 0) return [];

        const allTasks = await this.getAllTasks();
        const totalTasks = allTasks.length;

        if (k >= totalTasks) {
            // For full sorts, use more efficient approach
            if (totalTasks <= 1) return allTasks;

            // Use typed arrays for better performance on large arrays
            return totalTasks > 1000
                ? this._sortTasksEfficiently(allTasks)
                : [...allTasks].sort((a, b) => b.state.priority - a.state.priority);
        }

        return this._shouldUsePriorityQueue(k, totalTasks)
            ? this._getHighestPriorityTasksWithPQ(allTasks, k)
            : this._getTopKBySorting(allTasks, k);
    }

    _sortTasksEfficiently(tasks) {
        // For very large arrays, use a more memory-efficient approach
        return [...tasks].sort((a, b) => b.state.priority - a.state.priority);
    }

    _getTopKBySorting(tasks, k) {
        // Optimized partial sort for better performance
        const sorted = [...tasks].sort((a, b) => b.state.priority - a.state.priority);
        return sorted.slice(0, k);
    }

    async _clone() {
        const newMemory = new Memory(this.config, this.eventBus, this.commandBus);
        Object.assign(newMemory, {
            terms: new Map(this.terms),
            shortTermTasks: new Map(this.shortTermTasks),
            longTermTasks: new Map(this.longTermTasks),
            indexer: this.indexer.clone(),
            forgettingStrategy: this.forgettingStrategy,
            cycleCounter: this.cycleCounter,
        });
        return newMemory;
    }

    async _removeTerm(key) {
        const term = this.terms.get(key);
        if (!term) return;
        term.destroy?.();
        this.terms.delete(key);
        this.indexer.removeTerm(key);
        if (this.eventBus && typeof this.eventBus.emitAsync === 'function') {
            await this.eventBus.emitAsync(SystemEvents.TERM_REMOVE, {
                key
            });
        }
    }

    async _clear() {
        this.terms.forEach(term => term.destroy?.());
        this.terms.clear();
        this.shortTermTasks.clear();
        this.longTermTasks.clear();
        this.indexer.clear();
        this.cycleCounter = 0;
        this._invalidateCachedTasks();
        if (this.eventBus && typeof this.eventBus.emitAsync === 'function') {
            await this.eventBus.emitAsync(SystemEvents.SYSTEM_RESET);
        }
    }

    _getStatistics() {
        const totalCacheRequests = (this._cacheStats.queryHits + this._cacheStats.queryMisses +
                                   this._cacheStats.punctuationHits + this._cacheStats.punctuationMisses +
                                   this._cacheStats.recentHits + this._cacheStats.recentMisses +
                                   this._cacheStats.semanticHits + this._cacheStats.semanticMisses +
                                   this._cacheStats.termRelationshipHits + this._cacheStats.termRelationshipMisses);

        const totalHits = this._cacheStats.queryHits + this._cacheStats.punctuationHits +
                         this._cacheStats.recentHits + this._cacheStats.semanticHits + this._cacheStats.termRelationshipHits;

        // Calculate memory pressure and access metrics
        const currentMemoryPressure = this._memoryPressureHistory.length > 0 ?
            this._memoryPressureHistory[this._memoryPressureHistory.length - 1].pressure : 0;
        const avgMemoryPressure = this._memoryPressureHistory.length > 0 ?
            this._memoryPressureHistory.reduce((sum, entry) => sum + entry.pressure, 0) / this._memoryPressureHistory.length : 0;

        return {
            terms: this.terms.size,
            shortTermTasks: this.shortTermTasks.size,
            longTermTasks: this.longTermTasks.size,
            totalTasks: this.shortTermTasks.size + this.longTermTasks.size,
            cycleCount: this.cycleCounter,
            accessCount: this._accessCounter,
            timeSinceLastMaintenance: Date.now() - this._lastMaintenanceTime,
            ...this.indexer.getStatistics(),
            // Numeric cache statistics for backward compatibility
            queryCacheSize: this._queryCache.size,
            punctuationCacheSize: this._punctuationCache.size,
            recentTasksCacheSize: this._recentTasksCache.size,
            semanticCacheSize: this._semanticCache.size,
            termRelationshipCacheSize: this._termRelationshipCache.size,
            totalCacheRequests,
            cacheHitRate: totalCacheRequests > 0 ? (totalHits / totalCacheRequests) * 100 : 0,
            semanticCacheHitRate: (this._cacheStats.semanticHits + this._cacheStats.semanticMisses) > 0 ?
                (this._cacheStats.semanticHits / (this._cacheStats.semanticHits + this._cacheStats.semanticMisses)) * 100 : 0,
            termRelationshipCacheHitRate: (this._cacheStats.termRelationshipHits + this._cacheStats.termRelationshipMisses) > 0 ?
                (this._cacheStats.termRelationshipHits / (this._cacheStats.termRelationshipHits + this._cacheStats.termRelationshipMisses)) * 100 : 0,
            // Intelligent maintenance metrics
            currentMemoryPressure: currentMemoryPressure * 100,
            averageMemoryPressure: avgMemoryPressure * 100,
            accessPatternHistorySize: this._accessPatternHistory.length,
            memoryPressureHistorySize: this._memoryPressureHistory.length,
            maintenanceScore: this._calculateMaintenanceScore()
        };
    }

    async _getTasksByPunctuation(punctuation) {
        // Check cache first
        const cached = this._getCachedPunctuation(punctuation);
        if (cached) return cached;

        const taskIds = this.indexer.punctuationIndex.get(punctuation);
        if (!taskIds) {
            const result = [];
            this._setCachedPunctuation(punctuation, result);
            return result;
        }

        // More efficient: pre-allocate result array and use direct lookup
        const result = [];
        for (const taskId of taskIds) {
            const task = this.shortTermTasks.get(taskId) || this.longTermTasks.get(taskId);
            if (task) {
                result.push(task);
            }
        }

        this._setCachedPunctuation(punctuation, result);
        return result;
    }

    async _getRecentTasks(count = 10) {
        if (count <= 0) return [];

        // Check cache first
        const cached = this._getCachedRecentTasks(count);
        if (cached) return cached;

        const allTasks = await this.getAllTasks();
        if (count >= allTasks.length) {
            // If we want all or more tasks than we have, sort all and return
            const result = [...allTasks]
                .sort((a, b) => Number(b.state.stamp.creationTime) - Number(a.state.stamp.creationTime));
            this._setCachedRecentTasks(count, result);
            return result;
        }

        // For small count relative to total tasks, use Bag for statistical sampling
        // of most recent tasks based on creation time
        const bag = new Bag(count);

        for (const task of allTasks) {
            bag.put(task, Number(task.state.stamp.creationTime));
        }

        // Sample tasks using statistical priority sampling
        const sampledTasks = bag.sampleMultipleUnique(count);

        // Sort by creation time (most recent first) for consistent ordering
        return sampledTasks.sort((a, b) => Number(b.state.stamp.creationTime) - Number(a.state.stamp.creationTime));

        this._setCachedRecentTasks(count, result);
        return result;
    }

    async _queryTasks(filters = {}) {
        // Check cache first for repeated queries
        const cached = this._getCachedQuery(filters);
        if (cached) return cached;

        const result = this.indexer.queryTasks(await this.getAllTasks(), filters);
        this._setCachedQuery(filters, result);
        return result;
    }

    _exportState() {
        return JSON.stringify({
            terms: [...this.terms.values()],
            shortTermTasks: [...this.shortTermTasks.values()],
            longTermTasks: [...this.longTermTasks.values()],
        }, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2);
    }

    _createTaskFromJSON(json) {
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
    }

    async _importState(jsonState) {
        if (typeof jsonState !== 'string') {
            await this.clear();
            return;
        }

        const state = this._parseState(jsonState);
        await this.clear();

        if (state.terms) {
            await this._restoreTerms(state.terms);
        }

        await this._restoreTasks(state.shortTermTasks, this.shortTermTasks);
        await this._restoreTasks(state.longTermTasks, this.longTermTasks);
        this._invalidateCachedTasks();
    }

    _parseState(jsonState) {
        try {
            return JSON.parse(jsonState);
        } catch (e) {
            throw createError.ParseError(`Invalid JSON provided to importState: ${e.message}`);
        }
    }

    async _restoreTerms(termsData) {
        for (const termData of termsData) {
            const term = Term.fromJSON(termData);
            if (term) await this.addTerm(term);
        }
    }

    async _restoreTasks(tasksData, taskMap) {
        if (!tasksData) return;
        for (const taskData of tasksData) {
            const task = this._createTaskFromJSON(taskData);
            if (task) {
                taskMap.set(task.id, task);
                this.indexer.indexTask(task);
            }
        }
    }
}

export default Memory;
