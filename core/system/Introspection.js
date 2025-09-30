import {
    safeSync,
    safeAsync
} from '../utils/errorHandler.js';

class Introspection {
    constructor(system, commandBus) {
        this.system = system;
        this.commandBus = commandBus;
        this.reasoner = system.reasoner;
        this.planner = system.planner;
        this.metaCognition = system.metaCognition;
        this.eventBus = system.eventBus;
        // Use the config accessor if available, otherwise fall back to configManager
        this.configAccessor = system.config || {getAll: () => system.configManager?.getAll() || {}};
    }

    async getStatus() {
        return safeAsync(async () => ({
            isRunning: this.system.isRunning,
            cycleCount: this.system.cycleCount,
            memory: await this.commandBus.request('memory:getStats'),
            rules: this.reasoner.getRuleNames().length,
            actionHistory: this.system.actionExecutor.getActionHistory().length,
        }), 'getStatus', {});
    }

    getConfig() {
        return safeSync(() => this.configAccessor.getAll(), 'getConfig', {});
    }

    async getTask(id) {
        return await this.commandBus.request('memory:getTask', {id});
    }

    async getTerm(key) {
        return await this.commandBus.request('memory:getTerm', {key});
    }

    async queryTasks(filters = {}) {
        return await this.commandBus.request('memory:queryTasks', {filters});
    }

    async getMemoryStatistics() {
        return await this.commandBus.request('memory:getStats');
    }

    async getAllTerms() {
        return await this.commandBus.request('memory:getAllTerms');
    }

    getAvailableRules() {
        return this.reasoner.getRuleNames();
    }

    getRuleInfo(ruleName) {
        const rule = this.reasoner.getRule(ruleName);
        return rule ? {
            name: rule.name,
            arity: rule.arity,
            description: rule.description || 'No description available',
        } : null;
    }

    getPlan() {
        if (!this.planner || !this.planner.planCache) {
            return null;
        }
        const plans = Array.from(this.planner.planCache.values());
        return plans[plans.length - 1] || null;
    }

    getContradictions() {
        return this.metaCognition ? this.metaCognition.getContradictions() : [];
    }

    on(eventName, callback) {
        this.eventBus.on(eventName, callback);
    }

    off(eventName, callback) {
        this.eventBus.off(eventName, callback);
    }
}

export default Introspection;
