import { createUnifiedErrorHandler } from '../utils/errorHandler.js';
import { info } from '../utils/logger.js';
import ConfigManager from '../config/ConfigManager.js';
import System from './System.js';
import Cycle from './Cycle.js';
import Memory from '../memory/Memory.js';
import Reasoner from '../reasoner/Reasoner.js';
import LM from '../lm/LM.js';
import ActionExecutor from './ActionExecutor.js';
import Perception from './Perception.js';
import Planner from './Planner.js';
import MetaCognition from './MetaCognition.js';
import TemporalReasoner from '../reasoner/TemporalReasoner.js';
import PriorityManager from '../reasoner/PriorityManager.js';
import ContradictionAnalyzer from '../reasoner/ContradictionAnalyzer.js';
import ResolutionStrategy from '../reasoner/strategies/ResolutionStrategy.js';
import CONSTITUTION_TASKS from './Constitution.js';
import DIContainer from './DIContainer.js';
import EventBus from './EventBus.js';

const errorHandler = createUnifiedErrorHandler('SystemFactory');

const registerComponents = (container, configManager, components) => {
    container.registerValue('configManager', configManager);
    container.registerValue('eventBus', EventBus);

    // Register components with dependencies
    const singleton = { singleton: true };
    container.register('lm', LM, ['configManager'], singleton);
    container.register('temporalReasoner', TemporalReasoner, ['configManager'], singleton);
    container.register('actionExecutor', ActionExecutor, ['memory', 'configManager'], singleton);
    container.register('perception', Perception, ['memory', 'lm', 'eventBus'], singleton);
    container.register('planner', Planner, ['memory', 'lm', 'actionExecutor', 'configManager'], singleton);
    container.register('priorityManager', PriorityManager, ['memory', 'configManager'], singleton);
    container.register('contradictionAnalyzer', ContradictionAnalyzer, [], singleton);
    container.register('resolutionStrategy', ResolutionStrategy, [], singleton);

    // Assuming Reasoner's constructor will be refactored to (configManager, temporalReasoner)
    container.register('reasoner', Reasoner, ['configManager', 'temporalReasoner'], singleton);

    // Assuming MetaCognition's constructor will be refactored to (configManager, contradictionAnalyzer, resolutionStrategy)
    container.register('metaCognition', MetaCognition, ['configManager', 'contradictionAnalyzer', 'resolutionStrategy', 'eventBus'], singleton);

    container.register('cycle', Cycle, [
        'configManager', 'memory', 'reasoner', 'lm', 'actionExecutor', 'perception',
        'planner', 'metaCognition', 'temporalReasoner', 'priorityManager', 'eventBus'
    ], singleton);

    container.register('memory', Memory, ['configManager', 'eventBus'], singleton);
    container.register('system', System, [
        'configManager', 'memory', 'reasoner', 'lm', 'actionExecutor', 'cycle',
        'planner', 'metaCognition', 'perception', 'eventBus'
    ], singleton);

    // Override with any user-provided components
    for (const [name, instance] of Object.entries(components)) {
        container.registerValue(name, instance);
    }
};

const initializeSystem = async (system) => {
    info('SystemFactory: Initializing system with constitution...');
    await system.initialize(CONSTITUTION_TASKS);
    info('SystemFactory: System initialized.');
    return system;
};

const createSystem = async (userConfig = {}, components = {}) => {
    return await errorHandler.execute(async () => {
        info('SystemFactory: Creating new system...');

        const container = DIContainer; // Use the singleton container

        const configManager = new ConfigManager(userConfig);

        registerComponents(container, configManager, components);

        const system = container.get('system');
        await initializeSystem(system);

        info('SystemFactory: System creation complete.');
        return system;
    }, 'createSystem');
};

export default {
    createSystem
};