import {LIFETIME} from './DIContainer.js';
import createConfigAccessor from '../config/ConfigAccessor.js';
import System from './System.js';
import Cycle from './Cycle.js';
import Memory from '../memory/Memory.js';
import Reasoner from '../reasoner/Reasoner.js';
import LM from '../lm/LM.js';
import Tools from '../lm/Tools.js';
import NarseseTranslator from '../utils/NarseseTranslator.js';
import ActionExecutor from './ActionExecutor.js';
import Perception from './Perception.js';
import Planner from './Planner.js';
import MetaCognition from './MetaCognition.js';
import TemporalReasoner from '../reasoner/TemporalReasoner.js';
import PriorityManager from '../reasoner/PriorityManager.js';
import ContradictionAnalyzer from '../reasoner/ContradictionAnalyzer.js';
import ResolutionStrategy from '../reasoner/strategies/ResolutionStrategy.js';
import EventBus from './EventBus.js';
import TruthValueManager from '../reasoner/TruthValueManager.js';
import TaskFactory from '../core/TaskFactory.js';
import StrategyRegistry from '../reasoner/StrategyRegistry.js';

/**
 * Registers all core components with the DI container.
 * @param {DIContainer} container - The DI container instance.
 * @param {ConfigManager} configManager - The configuration manager.
 */
const registerComponents = (container, configManager) => {
    // Create and register the accessor, not the raw manager
    const configAccessor = createConfigAccessor(configManager);
    container.registerValue('configAccessor', configAccessor);
    container.registerValue('eventBus', EventBus);

    const singleton = {lifetime: LIFETIME.SINGLETON};

    // Foundational components first
    container.register('narseseTranslator', NarseseTranslator, ['configAccessor'], singleton);
    container.register('tools', Tools, ['configAccessor', 'narseseTranslator', 'eventBus'], singleton);
    container.register('memory', Memory, ['configAccessor', 'eventBus'], singleton);
    container.register('truthValueManager', TruthValueManager, [], singleton);
    container.register('strategyRegistry', StrategyRegistry, [], singleton);
    container.register('lm', LM, ['configAccessor', 'tools'], singleton);

    // Components that depend on the foundational ones
    container.register('taskFactory', TaskFactory, ['memory', 'lm', 'eventBus'], singleton);
    container.register('temporalReasoner', TemporalReasoner, ['configAccessor'], singleton);
    container.register('actionExecutor', ActionExecutor, ['memory', 'configAccessor', 'eventBus', 'tools'], singleton);
    container.register('perception', Perception, ['memory', 'taskFactory', 'eventBus'], singleton);
    container.register('planner', Planner, ['memory', 'lm', 'actionExecutor', 'configAccessor'], singleton);
    container.register('priorityManager', PriorityManager, ['memory', 'configAccessor'], singleton);
    container.register('contradictionAnalyzer', ContradictionAnalyzer, [], singleton);
    container.register('resolutionStrategy', ResolutionStrategy, ['truthValueManager'], singleton);

    // Higher-level components
    container.register('reasoner', Reasoner, ['configAccessor', 'temporalReasoner', 'strategyRegistry'], singleton);
    container.register('metaCognition', MetaCognition, ['configAccessor', 'contradictionAnalyzer', 'resolutionStrategy', 'eventBus'], singleton);

    // The main cycle and system, which depend on almost everything else
    container.register('cycle', Cycle, [
        'configAccessor', 'memory', 'reasoner', 'lm', 'actionExecutor', 'perception',
        'planner', 'metaCognition', 'temporalReasoner', 'priorityManager', 'eventBus'
    ], singleton);
    container.register('system', System, [
        'configAccessor', 'memory', 'reasoner', 'lm', 'actionExecutor', 'cycle',
        'planner', 'metaCognition', 'perception', 'eventBus', 'tools'
    ], singleton);
};

export default registerComponents;
