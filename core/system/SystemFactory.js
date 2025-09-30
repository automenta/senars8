import {info} from '../utils/logger.js';
import ConfigManager from '../config/ConfigManager.js';
import {DIContainer} from './DIContainer.js';
import registerComponents from './register-components.js';
import CONSTITUTION_TASKS from './Constitution.js';
import BagSamplingStrategy from '../reasoner/strategies/BagSamplingStrategy.js';
import BruteForceStrategy from '../reasoner/strategies/BruteForceStrategy.js';
import {configService} from '../config/index.js';

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

    // Initialize the global config service with the merged configuration
    configService.initialize(configManager.getAll());

    info('SystemFactory: Registering components...');
    registerComponents(container, configManager);

    // Override with any user-provided components
    for (const [name, instance] of Object.entries(components)) {
        container.registerValue(name, instance);
    }

    info('SystemFactory: Registering strategies...');
    const strategyRegistry = container.get('strategyRegistry');
    strategyRegistry.registerStrategies([
        BagSamplingStrategy,
        BruteForceStrategy,
    ]);

    info('SystemFactory: Getting system instance...');
    const system = container.get('system');

    info('SystemFactory: Initializing system...');
    initializeSystem(system);

    info('SystemFactory: System creation complete.');
    return system;
};

export {createSystem};

// Keep the default export for backward compatibility
export default {
    createSystem
};