import EventBus from './EventBus.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('Introspection');

class Introspection {
    constructor(system) {
        this.system = system;
        this.memory = system.memory;
        this.reasoner = system.reasoner;
        this.configManager = system.configManager;
    }

    getStatus() {
        return errorHandler.safeSync(() => ({
            isRunning: this.system.isRunning,
            cycleCount: this.system.cycleCount,
            memory: this.memory.getStatistics(),
            rules: this.reasoner.getRuleNames().length,
            actionHistory: this.system.actionExecutor.getActionHistory().length,
        }), 'getStatus', {});
    }

    getConfig() {
        return errorHandler.safeSync(() => this.configManager.getAll(), 'getConfig', {});
    }

    getTask(id) {
        return this.memory.getTask(id);
    }

    getTerm(key) {
        return this.memory.getTerm(key);
    }

    queryTasks(filters = {}) {
        return this.memory.queryTasks(filters);
    }

    getMemoryStatistics() {
        return this.memory.getStatistics();
    }

    getAllTerms() {
        return this.memory.getAllTerms();
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

    on(eventName, callback) {
        EventBus.on(eventName, callback);
    }

    off(eventName, callback) {
        EventBus.off(eventName, callback);
    }
}

export default Introspection;
