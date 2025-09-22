import { info, warn } from '../utils/logger.js';

class StrategyRegistry {
    constructor() {
        this.strategies = new Map();
    }

    registerStrategies(strategies) {
        for (const strategy of strategies) {
            this.register(strategy.name, strategy);
        }
    }

    register(name, strategyClass) {
        if (this.strategies.has(name)) {
            warn(`Strategy "${name}" is already registered. Overwriting.`);
        }
        this.strategies.set(name, strategyClass);
        info(`Registered strategy: ${name}`);
    }

    getStrategy(name) {
        const StrategyClass = this.strategies.get(name);
        if (!StrategyClass) {
            throw new Error(`Strategy "${name}" not found.`);
        }
        return new StrategyClass();
    }

    getStrategyNames() {
        return [...this.strategies.keys()];
    }
}

export default StrategyRegistry;
