import {error as logError, info, warn} from '../utils/logger.js';

class StrategyRegistry {
    constructor() {
        this.strategies = new Map();
        this.instances = new Map();
        this.metadata = new Map();
        this.stats = new Map();
        info('StrategyRegistry initialized');
    }

    register(name, strategyClass) {
        if (this.strategies.has(name)) {
            warn(`Strategy "${name}" is already registered. Overwriting.`);
        }
        this.strategies.set(name, strategyClass);
        this._initStats(name, 'combination');
        info(`Registered strategy: ${name}`);
    }

    registerStrategies(strategyClasses) {
        if (!Array.isArray(strategyClasses)) throw new Error('strategyClasses must be an array');

        for (const StrategyClass of strategyClasses) {
            const isReasoning = this._isReasoning(StrategyClass);
            const isCombination = this._isCombination(StrategyClass);

            if (isReasoning) {
                try {
                    const metadata = new StrategyClass().getMetadata();
                    if (metadata?.name) {
                        this._register(metadata.name, StrategyClass, 'reasoning');
                    }
                } catch (error) {
                    warn(`Error registering reasoning strategy ${StrategyClass.name}: ${error.message}`);
                }
            } else if (isCombination) {
                const name = StrategyClass.name || this._nameFromClass(StrategyClass);
                this._register(name, StrategyClass, 'combination');
            } else {
                const name = StrategyClass.name || this._nameFromClass(StrategyClass);
                this._register(name, StrategyClass, 'combination');
                warn(`Strategy class ${StrategyClass.name} registered as combination strategy`);
            }
        }
    }

    registerReasoningStrategy(name, strategyClass) {
        this._validateName(name);
        this._validateClass(strategyClass);
        if (!this._isReasoning(strategyClass)) {
            throw new Error(`Strategy class for "${name}" does not implement ReasoningStrategy interface.`);
        }
        this._register(name, strategyClass, 'reasoning');
    }

    registerCombinationStrategy(name, strategyClass) {
        this._validateName(name);
        this._validateClass(strategyClass);
        if (!this._isCombination(strategyClass)) {
            throw new Error(`Strategy class for "${name}" does not have required selectCombinations method.`);
        }
        this._register(name, strategyClass, 'combination');
    }

    _register(name, strategyClass, type) {
        this.strategies.set(name, strategyClass);
        this.metadata.delete(name);
        this._initStats(name, type);
    }

    _validateName(name) {
        if (!name || typeof name !== 'string') throw new Error('Strategy name must be a non-empty string');
    }

    _validateClass(strategyClass) {
        if (typeof strategyClass !== 'function') throw new Error('Strategy class must be a constructor function');
    }

    getStrategy(name) {
        if (!this.strategies.has(name)) throw new Error(`Strategy "${name}" not found.`);

        if (!this.instances.has(name)) {
            const StrategyClass = this.strategies.get(name);
            this.instances.set(name, new StrategyClass());
            this._recordUsage(name);
        }

        this._recordUsage(name);
        return this.instances.get(name);
    }

    getCombinationStrategy(name) {
        return this.getStrategy(name);
    }

    getReasoningStrategy(name) {
        return this.getStrategy(name);
    }

    getStrategyNames() {
        return [...this.strategies.keys()];
    }

    getReasoningStrategyNames() {
        return this.getStrategyNames();
    }

    getCombinationStrategyNames() {
        return this.getStrategyNames();
    }

    getAllReasoningStrategies() {
        return this.getStrategyNames().map(name => ({
            name,
            metadata: this.getStrategyMetadata(name),
            instance: this.getStrategy(name)
        }));
    }

    getStrategyMetadata(name) {
        if (!this.metadata.has(name)) {
            try {
                const strategy = this.getStrategy(name);
                this.metadata.set(name, strategy.getMetadata());
            } catch (error) {
                logError(`Error getting metadata for strategy "${name}":`, error);
                this.metadata.set(name, {
                    name,
                    description: `Error loading metadata for ${name}`,
                    supportedTaskTypes: [],
                    category: 'unknown',
                    priority: 0.5
                });
            }
        }
        return this.metadata.get(name);
    }

    findApplicableStrategies(task, context, options = {}) {
        const {minPriority = 0, allowedCategories = null} = options;
        const applicable = [];

        for (const name of this.strategies.keys()) {
            try {
                const instance = this.getStrategy(name);
                const metadata = this.getStrategyMetadata(name);

                if (allowedCategories?.length && !allowedCategories.includes(metadata.category)) continue;
                if ((metadata.priority || 0.5) < minPriority) continue;
                if (instance.canHandle(task, context)) {
                    applicable.push({name, instance, metadata});
                }
            } catch (error) {
                warn(`Error checking strategy "${name}": ${error.message}`);
            }
        }

        return applicable.sort((a, b) => (b.metadata.priority || 0) - (a.metadata.priority || 0));
    }

    unregister(name) {
        if (this.strategies.has(name)) {
            this.strategies.delete(name);
            this.instances.delete(name);
            this.metadata.delete(name);
            this.stats.delete(name);
            info(`Unregistered strategy: ${name}`);
        } else {
            warn(`Strategy "${name}" not found for unregistration`);
        }
    }

    clear() {
        this.strategies.clear();
        this.instances.clear();
        this.metadata.clear();
        this.stats.clear();
        info('StrategyRegistry cleared all strategies');
    }

    _isReasoning(StrategyClass) {
        try {
            const instance = new StrategyClass();
            return typeof instance.canHandle === 'function' &&
                typeof instance.execute === 'function' &&
                typeof instance.getMetadata === 'function' &&
                typeof instance.validate === 'function';
        } catch {
            return false;
        }
    }

    _isCombination(StrategyClass) {
        try {
            const instance = new StrategyClass();
            return typeof instance.selectCombinations === 'function';
        } catch {
            return false;
        }
    }

    _nameFromClass(StrategyClass) {
        let name = StrategyClass.name || 'UnnamedStrategy';
        return name.endsWith('Strategy') ? name.slice(0, -8) : name;
    }

    _initStats(name, type) {
        if (!this.stats.has(name)) {
            this.stats.set(name, {type, usageCount: 0, lastUsed: null, errors: 0});
        }
    }

    _recordUsage(name) {
        const stats = this.stats.get(name);
        if (stats) {
            stats.usageCount++;
            stats.lastUsed = Date.now();
        }
    }

    _recordError(name) {
        const stats = this.stats.get(name);
        if (stats) stats.errors++;
    }

    getUsageStats() {
        return {
            totalStrategies: this.strategies.size,
            strategyDetails: Object.fromEntries([...this.stats.entries()].map(([k, v]) => [k, {...v}]))
        };
    }
}

export default StrategyRegistry;