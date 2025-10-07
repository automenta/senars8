
import Component from './Component.js';
import ReasonerCore from '../core/reasoner/Reasoner.js';
import rules from '../core/reasoner/rules/index.js';
import {debug, error as logError, info, warn} from '../core/utils/logger.js';
import {createUnifiedErrorHandler} from '../core/utils/errorHandler.js';
import createConfigAccessor from '../core/config/ConfigAccessor.js';
import {SystemCommands} from '../core/system/SystemCommands.js';

const errorHandler = createUnifiedErrorHandler('Reasoning');

class Reasoning extends Component {
    constructor(core) {
        super('reasoning', core);

        // Initialize core reasoner with proper dependencies
        this.reasonerCore = new ReasonerCore(
            this.core.config,
            this.core.temporalReasoner || null, // Will be set up later if available
            this.core.strategyRegistry || null,  // Will be set up later if available
            this.core.messages  // Use coreagent's message system as command bus
        );

        // Set system context for modular reasoning
        if (this.core.systemContext) {
            this.reasonerCore.setSystemContext(this.core.systemContext);
        }

        // Expose core reasoner methods for compatibility
        this.performInference = this.reasonerCore.performInference.bind(this.reasonerCore);
        this.getRuleNames = this.reasonerCore.getRuleNames.bind(this.reasonerCore);
        this.getRule = this.reasonerCore.getRule.bind(this.reasonerCore);
        this.getRuleStatistics = this.reasonerCore.getRuleStatistics.bind(this.reasonerCore);
        this.getPerformanceStats = this.reasonerCore.getPerformanceStats.bind(this.reasonerCore);
    }

    setupHandlers() {
        // Core reasoning command handlers
        this.core.messages.handle('reasoning:process', (data) => this._processTaskCompat(data));
        this.core.messages.handle('reasoner:processTask', (data) => this._processTaskLegacyCompat(data));

        // Legacy compatibility handlers
        this.core.messages.handle(SystemCommands.REASONER_PROCESS_TASK, async (payload) =>
            this._processTaskLegacyCompat(payload));
    }

    // Compatibility wrapper methods
    async _processTaskCompat({task, beliefs = []}) {
        if (!task) return null;

        // Convert coreagent task format to core Task if needed
        const coreTask = this._convertToCoreTask(task);
        const coreBeliefs = beliefs.map(belief => this._convertToCoreTask(belief)).filter(b => b !== null);

        try {
            const result = await this.reasonerCore.performInference([coreTask]);
            return result.length > 0 ? this._convertFromCoreTask(result[0]) : null;
        } catch (error) {
            logError('Error in reasoning process:', error);
            return null;
        }
    }

    async _processTaskLegacyCompat(payload) {
        const {focusSet = [], options = {}} = payload || {};
        if (!Array.isArray(focusSet)) {
            throw new Error(`Focus set must be an array, received: ${typeof focusSet}`);
        }

        if (focusSet.length === 0) return [];

        const allDerivedTasks = [];
        const maxDerivedTasks = options.maxDerivedTasks || Infinity;

        for (const task of focusSet) {
            if (allDerivedTasks.length >= maxDerivedTasks) break;

            // Get beliefs to combine with each task
            const beliefs = await this.core.request('memory:query', {
                type: 'belief',
                limit: 50
            });

            const result = await this._processTaskCompat({task, beliefs});
            if (result) {
                allDerivedTasks.push(result);
                if (allDerivedTasks.length >= maxDerivedTasks) break;
            }
        }

        return allDerivedTasks.slice(0, maxDerivedTasks);
    }

    _convertToCoreTask(taskData) {
        if (!taskData) return null;

        // If it's already a core Task, return as-is
        if (taskData.constructor && taskData.constructor.name === 'Task') {
            return taskData;
        }

        // Convert coreagent task format to core Task
        if (typeof taskData === 'object' && taskData.termKey && taskData.punctuation) {
            try {
                return new this.core.Task(
                    taskData.term,
                    taskData.punctuation,
                    taskData.truthValue || {},
                    taskData.stamp || {}
                );
            } catch (error) {
                warn(`Failed to convert task data to core Task: ${error.message}`);
                return null;
            }
        }

        return null;
    }

    _convertFromCoreTask(coreTask) {
        if (!coreTask) return null;

        // Convert core Task back to coreagent format
        return {
            id: coreTask.id,
            termKey: coreTask.termKey,
            punctuation: coreTask.punctuation,
            priority: coreTask.state?.priority || 0,
            truthValue: coreTask.state?.truthValue || {frequency: 0.5, confidence: 0.5},
            stamp: coreTask.state?.stamp || {},
            type: 'belief' // Default type for derived tasks
        };
    }

    // Enhanced methods for coreagent API compatibility
    async _processTask({task, beliefs = []}) {
        return await this._processTaskCompat({task, beliefs});
    }

    async _processTaskLegacy(payload) {
        return await this._processTaskLegacyCompat(payload);
    }

    // Strategy management methods
    addStrategy(strategy) {
        if (!this.core.strategyRegistry) {
            warn('Strategy registry not available, cannot add strategy');
            return;
        }

        try {
            this.core.strategyRegistry.registerStrategy(strategy);
        } catch (error) {
            logError('Error adding strategy:', error);
        }
    }

    // Rule management methods
    getStats() {
        return {
            rules: this.reasonerCore.getRuleStatistics(),
            performance: this.reasonerCore.getPerformanceStats(),
            strategies: this.core.strategyRegistry ?
                this.core.strategyRegistry.getAllReasoningStrategies().length : 0
        };
    }

    async onStart() {
        // Initialize core reasoner if needed
        if (this.reasonerCore && typeof this.reasonerCore.initialize === 'function') {
            await this.reasonerCore.initialize();
        }
    }

    async onStop() {
        // Clean shutdown of core reasoner
        if (this.reasonerCore && typeof this.reasonerCore.shutdown === 'function') {
            await this.reasonerCore.shutdown();
        }
    }

    // Additional utility methods for coreagent compatibility
    getRuleNames() {
        return this.reasonerCore.getRuleNames();
    }

    getRule(name) {
        return this.reasonerCore.getRule(name);
    }

    getRuleStatistics() {
        return this.reasonerCore.getRuleStatistics();
    }

    getPerformanceStats() {
        return this.reasonerCore.getPerformanceStats();
    }
}

export default Reasoning;
