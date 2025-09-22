import { info } from '../utils/logger.js';
import ConfigManager from '../config/ConfigManager.js';
import { DIContainer } from './DIContainer.js';
import registerComponents from './register-components.js';
import CONSTITUTION_TASKS from './Constitution.js';
import BagSamplingStrategy from '../reasoner/strategies/BagSamplingStrategy.js';
import BruteForceStrategy from '../reasoner/strategies/BruteForceStrategy.js';

const initializeSystem = (system) => {
    info('SystemFactory: Initializing system with constitution...');
    system.initialize(CONSTITUTION_TASKS);
    info('SystemFactory: System initialized.');
    return system;
};

const createSystem = (userConfig = {}, components = {}) => {
    info('SystemFactory: Creating new system...');

    const container = new DIContainer();

    const configManager = new ConfigManager(userConfig);

    registerComponents(container, configManager);

    // Override with any user-provided components
    for (const [name, instance] of Object.entries(components)) {
        container.registerValue(name, instance);
    }

    const strategyRegistry = container.get('strategyRegistry');
    strategyRegistry.registerStrategies([
        BagSamplingStrategy,
        BruteForceStrategy,
    ]);

    const system = container.get('system');
    initializeSystem(system);

    info('SystemFactory: System creation complete.');
    return system;
};

export default {
    createSystem
};