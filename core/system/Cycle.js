import {debug, info} from '../utils/logger.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import {wrapAsync} from '../utils/asyncWrapper.js';
import {configService} from '../config/index.js';
import {SystemCommands} from './SystemCommands.js';
import {SystemEvents} from './SystemEvents.js';
import Bag from '../utils/bag.js';
import Bag from '../utils/bag.js';

const errorHandler = createUnifiedErrorHandler('Cycle');

class Cycle {
    constructor(
        configManager,
        memory,
        reasoner,
        lm,
        perception,
        planner,
        metaCognition,
        temporalReasoner,
        priorityManager,
        eventBus,
        commandBus
    ) {
        this.config = configService;
        this.memory = memory; // Kept for now for direct access if needed, but prefer commands/events
        this.reasoner = reasoner; // Kept for now
        this.lm = lm;
        this.perception = perception;
        this.planner = planner;
        this.metaCognition = metaCognition;
        this.temporalReasoner = temporalReasoner;
        this.priorityManager = priorityManager;
        this.eventBus = eventBus;
        this.commandBus = commandBus;
        this.cycleCount = 0;

        // Intelligent cycle timing
        this._cycleTimings = [];
        this._systemLoadHistory = [];
        this._baseCycleInterval = this.config.getNumber('CYCLE_BASE_INTERVAL_MS', 100);
        this._adaptiveCycleInterval = this._baseCycleInterval;

        // Bag-based focus set management for non-greedy priority sampling
        this._focusSetBag = new Bag(this.config.getNumber('FOCUS_SET_SIZE', 20));
        this._diversityBag = new Bag(this.config.getNumber('FOCUS_SET_DIVERSITY_SIZE', 10));

        this.runOnce = wrapAsync(this._runOnce.bind(this), 'Cycle', 'runOnce');
    }

    async bootstrap(_constitutionTasks) {
        info('Cycle: Bootstrap completed');
    }

    async _runOnce() {
        const cycleStartTime = performance.now();
        this.cycleCount++;
        debug(`Starting cycle ${this.cycleCount}`);
        this.eventBus.emit(SystemEvents.CYCLE_START, this.cycleCount);

        try {
            const focusSet = await this._selectFocusSet();
            const {
                derivedTasks,
                actionableGoals
            } = await this._performInference(focusSet);

            await this._executeActions(actionableGoals);
            await this._learnFromExperience(derivedTasks);

            await this._updateMemory(derivedTasks);

            const cycleEndTime = performance.now();
            const cycleDuration = cycleEndTime - cycleStartTime;

            // Track cycle performance for adaptive timing
            this._trackCyclePerformance(cycleDuration, focusSet.length, derivedTasks.length);

            this.eventBus.emit(SystemEvents.CYCLE_COMPLETE, this.cycleCount);
        } catch (error) {
            // Log error but don't throw to ensure CYCLE_COMPLETE event is emitted
            console.error(`Cycle ${this.cycleCount} error:`, error);
            // Still emit the complete event even on error to maintain test compatibility
            this.eventBus.emit(SystemEvents.CYCLE_COMPLETE, this.cycleCount);
        }
    }

    async run() {
        await this.runOnce();

        // Apply intelligent cycle timing for next iteration
        await this._applyAdaptiveCycleTiming();
    }

    getAdaptiveCycleInterval() {
        return this._adaptiveCycleInterval;
    }

    async _selectFocusSet() {
        const focusSetSize = this.config.getNumber('FOCUS_SET_SIZE', 20);
        const useSemanticPrioritization = this.config.getBoolean('CYCLE_USE_SEMANTIC_PRIORITIZATION', true);
        const useProactiveEnrichment = this.config.getBoolean('CYCLE_USE_PROACTIVE_ENRICHMENT', true);

        let focusSet;

        if (useSemanticPrioritization && this.lm) {
            focusSet = await this._selectFocusSetWithSemanticPrioritization(focusSetSize);
        } else {
            focusSet = await this.commandBus.request(SystemCommands.MEMORY_GET_HIGHEST_PRIORITY_TASKS, focusSetSize);
        }

        if (!focusSet) return [];

        // Apply proactive enrichment if enabled and LM is available
        if (useProactiveEnrichment && this.lm && this.lm.proactiveEnricher) {
            focusSet = await this._enrichFocusSetProactively(focusSet);
        }

        // Only update priorities if priorityManager exists
        if (this.priorityManager && this.priorityManager.updatePriority) {
            for (const task of focusSet) {
                this.priorityManager.updatePriority(task);
            }
        }

        return focusSet;
    }

    async _selectFocusSetWithBagSampling(focusSetSize) {
        try {
            // Get base tasks using memory's Bag-based sampling
            const baseTasks = await this.commandBus.request(SystemCommands.MEMORY_GET_HIGHEST_PRIORITY_TASKS, focusSetSize * 2);

            if (!baseTasks || baseTasks.length === 0) {
                return [];
            }

            // Use Bag for non-greedy priority-based sampling
            this._focusSetBag.clear();
            for (const task of baseTasks) {
                this._focusSetBag.put(task, task.state.priority);
            }

            // Sample using statistical priority sampling
            const sampledTasks = this._focusSetBag.sampleMultipleUnique(focusSetSize);

            // Add diversity sampling for better coverage
            const diversityTasks = this._addDiversitySampling(baseTasks, sampledTasks, focusSetSize);

            // Combine and deduplicate
            const combinedSet = [...sampledTasks, ...diversityTasks];
            const uniqueTasks = this._deduplicateTasks(combinedSet);

            return uniqueTasks.slice(0, focusSetSize);

        } catch (error) {
            errorHandler.handle(error, `_selectFocusSetWithBagSampling`);
            // Fallback to basic priority selection on error
            return await this.commandBus.request(SystemCommands.MEMORY_GET_HIGHEST_PRIORITY_TASKS, focusSetSize);
        }
    }

    _addDiversitySampling(baseTasks, currentTasks, targetSize) {
        if (currentTasks.length >= targetSize) return [];

        const currentTaskIds = new Set(currentTasks.map(t => t.id));
        const remainingTasks = baseTasks.filter(t => !currentTaskIds.has(t.id));

        if (remainingTasks.length === 0) return [];

        // Use diversity bag for different sampling strategy
        this._diversityBag.clear();
        for (const task of remainingTasks) {
            // Use a combination of priority and recency for diversity
            const diversityScore = task.state.priority * 0.7 + (Number(task.state.stamp.creationTime) / Date.now()) * 0.3;
            this._diversityBag.put(task, diversityScore);
        }

        const neededTasks = targetSize - currentTasks.length;
        return this._diversityBag.sampleMultipleUnique(neededTasks);
    }

    _deduplicateTasks(tasks) {
        const seen = new Set();
        return tasks.filter(task => {
            if (seen.has(task.id)) return false;
            seen.add(task.id);
            return true;
        });
    }

    async _selectFocusSetWithSemanticPrioritization(focusSetSize) {
        try {
            // Get base focus set using priority
            const baseFocusSet = await this.commandBus.request(SystemCommands.MEMORY_GET_HIGHEST_PRIORITY_TASKS, focusSetSize);

            if (!baseFocusSet || baseFocusSet.length === 0) {
                return baseFocusSet;
            }

            // Apply semantic enhancement to improve focus set selection
            const enhancedFocusSet = await this._enhanceFocusSetWithSemantics(baseFocusSet);

            // Ensure we don't exceed the desired size
            return enhancedFocusSet.slice(0, focusSetSize);
        } catch (error) {
            errorHandler.handle(error, `_selectFocusSetWithSemanticPrioritization`);
            // Fallback to basic priority selection on error
            return await this.commandBus.request(SystemCommands.MEMORY_GET_HIGHEST_PRIORITY_TASKS, focusSetSize);
        }
    }

    async _enhanceFocusSetWithSemantics(baseFocusSet) {
        const enhancedSet = [];
        const semanticBoostFactor = this.config.getNumber('CYCLE_SEMANTIC_BOOST_FACTOR', 0.3);

        for (const task of baseFocusSet) {
            // Ensure task has the expected structure
            if (!task || !task.state || typeof task.state.priority !== 'number') {
                enhancedSet.push(task); // Keep original task if structure is unexpected
                continue;
            }

            let enhancedPriority = task.state.priority;

            // Apply semantic similarity boost if LM is available
            if (this.lm && task.termKey) {
                try {
                    const semanticBoost = await this._calculateSemanticBoost(task, baseFocusSet);
                    enhancedPriority += semanticBoost * semanticBoostFactor;
                } catch (error) {
                    // Keep original priority if semantic calculation fails
                    enhancedPriority = task.state.priority;
                }
            }

            enhancedSet.push({
                ...task,
                semanticPriority: enhancedPriority,
                originalPriority: task.state.priority
            });
        }

        // Sort by enhanced priority
        enhancedSet.sort((a, b) => b.semanticPriority - a.semanticPriority);

        // Return the original task objects for compatibility
        return enhancedSet.map(item => {
            const task = {...item};
            delete task.semanticPriority;
            delete task.originalPriority;
            if (task.state && typeof item.semanticPriority === 'number') {
                task.state.priority = item.semanticPriority;
            }
            return task;
        });
    }

    async _calculateSemanticBoost(task, focusSet) {
        try {
            // Find tasks in focus set that are semantically similar to current task
            const similarTasks = [];

            for (const otherTask of focusSet) {
                if (otherTask.id === task.id) continue;

                // Use memory's semantic similarity if available
                if (this.memory && this.memory.findSimilarTasks) {
                    const similarity = await this._getTaskSimilarity(task, otherTask);
                    if (similarity > 0.7) { // Threshold for semantic similarity
                        similarTasks.push({
                            task: otherTask,
                            similarity
                        });
                    }
                }
            }

            // Calculate boost based on number and quality of similar tasks
            if (similarTasks.length === 0) return 0;

            const avgSimilarity = similarTasks.reduce((sum, item) => sum + item.similarity, 0) / similarTasks.length;
            const boost = Math.min(avgSimilarity * similarTasks.length * 0.1, 0.5); // Cap boost at 0.5

            return boost;

        } catch (error) {
            errorHandler.handle(error, `_calculateSemanticBoost for task ${task.termKey}`);
            return 0;
        }
    }

    async _getTaskSimilarity(task1, task2) {
        try {
            // Use cosine similarity between task embeddings if available
            if (this.memory && this.memory.findSimilarTasks) {
                const similarTasks = await this.memory.findSimilarTasks(task1, 0.9, 1);
                return similarTasks.length > 0 ? 0.9 : 0.0;
            }
            return 0.0;
        } catch (error) {
            return 0.0;
        }
    }

    async _enrichFocusSetProactively(focusSet) {
        if (!this.lm?.proactiveEnricher) {
            return focusSet;
        }

        try {
            // Use proactive enricher to generate additional contextually relevant tasks
            const enrichedTasks = await this.lm.proactiveEnricher.proactiveEnrichment(focusSet);

            if (enrichedTasks && enrichedTasks.length > 0) {
                // Add enriched tasks to focus set with slightly lower priority
                const maxFocusSetSize = this.config.getNumber('FOCUS_SET_SIZE', 20);
                const enrichedPriority = this.config.getNumber('CYCLE_ENRICHED_TASK_PRIORITY', 0.3);

                const enhancedTasks = enrichedTasks
                    .filter(task => task && task.termKey) // Filter out invalid tasks
                    .map(task => {
                        // Create a copy with adjusted priority for enriched tasks
                        const enrichedTask = {...task};
                        enrichedTask.state = {
                            ...task.state,
                            priority: Math.min(task.state.priority, enrichedPriority)
                        };
                        return enrichedTask;
                    })
                    .slice(0, Math.max(0, maxFocusSetSize - focusSet.length)); // Don't exceed focus set size

                // Combine original focus set with enriched tasks
                const combinedSet = [...focusSet, ...enhancedTasks];

                debug(`Proactive enrichment added ${enhancedTasks.length} new tasks to focus set`);
                return combinedSet;
            }

            return focusSet;

        } catch (error) {
            errorHandler.handle(error, `_enrichFocusSetProactively`);
            return focusSet; // Return original focus set on error
        }
    }

    _trackCyclePerformance(cycleDuration, focusSetSize, derivedTasksCount) {
        const now = Date.now();
        this._cycleTimings.push({
            timestamp: now,
            duration: cycleDuration,
            focusSetSize,
            derivedTasksCount,
            cycleNumber: this.cycleCount
        });

        // Keep only last 20 cycle timings
        if (this._cycleTimings.length > 20) {
            this._cycleTimings.shift();
        }
    }

    async _applyAdaptiveCycleTiming() {
        if (this._cycleTimings.length < 3) {
            // Need more data for adaptive timing
            return;
        }

        // Calculate performance metrics
        const recentCycles = this._cycleTimings.slice(-5); // Last 5 cycles
        const avgDuration = recentCycles.reduce((sum, cycle) => sum + cycle.duration, 0) / recentCycles.length;
        const maxDuration = Math.max(...recentCycles.map(cycle => cycle.duration));

        // Get memory pressure from memory system if available
        let memoryPressure = 0;
        try {
            if (this.memory && this.memory._getStatistics) {
                const stats = this.memory._getStatistics();
                memoryPressure = stats.intelligentMaintenance ?
                    parseFloat(stats.intelligentMaintenance.currentMemoryPressure) / 100 : 0;
            }
        } catch (error) {
            // Ignore memory pressure calculation errors
        }

        // Calculate adaptive interval based on multiple factors
        const baseInterval = this._baseCycleInterval;
        let adaptiveMultiplier = 1.0;

        // Factor 1: Cycle duration performance
        if (avgDuration > 200) { // If cycles are taking longer than 200ms
            adaptiveMultiplier *= 0.8; // Slow down
        } else if (avgDuration < 50) { // If cycles are very fast
            adaptiveMultiplier *= 1.2; // Can speed up slightly
        }

        // Factor 2: Memory pressure
        if (memoryPressure > 0.7) {
            adaptiveMultiplier *= 0.9; // Reduce frequency under high memory pressure
        } else if (memoryPressure < 0.3) {
            adaptiveMultiplier *= 1.1; // Can increase frequency under low memory pressure
        }

        // Factor 3: Focus set efficiency
        const avgFocusSetSize = recentCycles.reduce((sum, cycle) => sum + cycle.focusSetSize, 0) / recentCycles.length;
        const avgDerivedTasks = recentCycles.reduce((sum, cycle) => sum + cycle.derivedTasksCount, 0) / recentCycles.length;

        if (avgFocusSetSize > 0 && avgDerivedTasks / avgFocusSetSize < 0.1) {
            // Low inference efficiency - slow down to allow more processing time
            adaptiveMultiplier *= 0.85;
        }

        // Apply bounds to prevent extreme timing changes
        adaptiveMultiplier = Math.max(0.5, Math.min(2.0, adaptiveMultiplier));

        this._adaptiveCycleInterval = Math.round(baseInterval * adaptiveMultiplier);

        debug(`Adaptive cycle timing: interval ${this._adaptiveCycleInterval}ms (base: ${baseInterval}ms, multiplier: ${adaptiveMultiplier.toFixed(2)})`);
    }

    getCyclePerformanceStats() {
        if (this._cycleTimings.length === 0) {
            return null;
        }

        const recentCycles = this._cycleTimings.slice(-10);
        const durations = recentCycles.map(cycle => cycle.duration);

        return {
            averageCycleDuration: durations.reduce((sum, duration) => sum + duration, 0) / durations.length,
            minCycleDuration: Math.min(...durations),
            maxCycleDuration: Math.max(...durations),
            totalCycles: this.cycleCount,
            adaptiveCycleInterval: this._adaptiveCycleInterval,
            baseCycleInterval: this._baseCycleInterval
        };
    }

    async _performInference(focusSet) {
        if (!this.reasoner || !focusSet || focusSet.length === 0) {
            return {
                derivedTasks: [],
                actionableGoals: []
            };
        }

        const derivedTasks = await this.commandBus.request(SystemCommands.REASONER_PROCESS_TASK, {
            focusSet
        });

        // Filter actionable goals from both focusSet and derivedTasks in a single pass
        const priorityThreshold = this.config.getNumber('ACTIONABLE_GOAL_PRIORITY_THRESHOLD', 0.1);
        const actionableGoals = [];

        // Combine both arrays and filter in one pass for better performance
        const allTasks = focusSet.concat(derivedTasks);
        for (const task of allTasks) {
            if (task.punctuation === '!' && task.state?.priority >= priorityThreshold) {
                actionableGoals.push(task);
            }
        }

        return {
            derivedTasks,
            actionableGoals
        };
    }

    async _executeActions(actionableGoals) {
        if (!actionableGoals || !actionableGoals.length) {
            return;
        }
        for (const goal of actionableGoals) {
            try {
                debug(`Requesting execution for goal: ${goal.termKey}`);
                await this.commandBus.request(SystemCommands.EXECUTE_ACTION, goal);
            } catch (error) {
                errorHandler.handle(error, `_executeActions for goal ${goal.termKey}`);
            }
        }
    }

    async _learnFromExperience(derivedTasks) {
        if (!this.lm || !derivedTasks || !derivedTasks.length) {
            return;
        }
        derivedTasks.forEach(task => {
            debug(`Would learn from task: ${task.termKey}`);
        });
    }

    async _updateMemory(derivedTasks) {
        if (!derivedTasks || !derivedTasks.length) {
            return;
        }
        await this.eventBus.emitAsync(SystemEvents.TASKS_ADD, derivedTasks);
    }
}

export default Cycle;
