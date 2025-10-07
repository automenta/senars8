import {LIFETIME} from './DIContainer.js';
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
import EventBus from './EventBus.js';
import CommandBus from './CommandBus.js';
import TruthValueManager from '../reasoner/TruthValueManager.js';
import TaskFactory from '../core/TaskFactory.js';
import StrategyRegistry from '../reasoner/StrategyRegistry.js';
import MetricsService from './MetricsService.js';

/**
 * Registers all core components with the DI container.
 * @param {DIContainer} container - The DI container instance.
 * @param {ConfigManager} configManager - The configuration manager.
 * @param {Object} additionalComponents - Additional components to register
 */
const registerComponents = (container, configManager, additionalComponents = {}) => {
    const singleton = {lifetime: LIFETIME.SINGLETON};

    container.registerValue('configManager', configManager);
    container.register('eventBus', EventBus, [], singleton);
    container.register('commandBus', CommandBus, [], singleton);
    container.register('metricsService', MetricsService, [], singleton);

    // Foundational components first
    container.register('memory', Memory, ['configManager', 'eventBus', 'commandBus'], singleton);
    container.register('truthValueManager', TruthValueManager, [], singleton);
    container.register('strategyRegistry', StrategyRegistry, ['metricsService'], singleton);
    container.register('lm', LM, ['configManager', 'commandBus', 'eventBus', 'metricsService'], singleton);

    // Components that depend on the foundational ones
    container.register('taskFactory', TaskFactory, ['memory', 'lm', 'eventBus', 'commandBus'], singleton);
    container.register('temporalReasoner', TemporalReasoner, ['configManager', 'metricsService'], singleton);
    container.register('actionExecutor', ActionExecutor, ['memory', 'configManager', 'eventBus', 'commandBus'], singleton);
    container.register('perception', Perception, ['memory', 'taskFactory', 'eventBus', 'commandBus'], singleton);
    container.register('planner', Planner, ['memory', 'lm', 'actionExecutor', 'configManager'], singleton);
    container.register('priorityManager', PriorityManager, ['memory', 'configManager'], singleton);
    container.register('contradictionAnalyzer', ContradictionAnalyzer, [], singleton);
    container.register('resolutionStrategy', ResolutionStrategy, ['truthValueManager', 'metricsService'], singleton);

    // Higher-level components
    container.register('reasoner', Reasoner, ['configManager', 'temporalReasoner', 'strategyRegistry', 'commandBus'], singleton);
    container.register('metaCognition', MetaCognition, ['configManager', 'contradictionAnalyzer', 'resolutionStrategy', 'eventBus', 'commandBus', 'metricsService'], singleton);

    // The main cycle and system, which depend on almost everything else
    container.register('cycle', Cycle, [
        'configManager', 'memory', 'reasoner', 'lm', 'perception',
        'planner', 'metaCognition', 'temporalReasoner', 'priorityManager', 'eventBus', 'commandBus'
    ], singleton);
    container.register('system', System, [
        'configManager', 'memory', 'reasoner', 'actionExecutor', 'cycle',
        'planner', 'metaCognition', 'perception', 'eventBus', 'commandBus'
    ], singleton);

    // Register any additional components provided by plugins or custom implementations
    Object.entries(additionalComponents).forEach(([name, {definition, dependencies = [], options = {}}]) => {
        container.register(name, definition, dependencies, {lifetime: LIFETIME.SINGLETON, ...options});
    });
};

export default registerComponents;
