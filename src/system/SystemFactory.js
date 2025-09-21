import {
    createModuleErrorHandler
} from '../utils/errorHandler.js';
import {
    debug,
    info
} from '../utils/logger.js';
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

const errorHandler = createModuleErrorHandler('SystemFactory');

const getComponent = (components, name, factory) => {
    const component = components[name];
    if (component) {
        debug(`SystemFactory: Using provided component ${name}:`, component);
        return component;
    }
    const defaultComponent = factory();
    debug(`SystemFactory: Created default component ${name}:`, defaultComponent);
    return defaultComponent;
};

const assembleComponents = (configManager, initialComponents = {}) => {
    info('SystemFactory: Assembling components...');

    const memory = getComponent(initialComponents, 'memory', () => new Memory(configManager));
    const lm = getComponent(initialComponents, 'lm', () => new LM(configManager));
    const temporalReasoner = getComponent(initialComponents, 'temporalReasoner', () => new TemporalReasoner(configManager));
    const reasoner = getComponent(initialComponents, 'reasoner', () => new Reasoner({temporalReasoner}, configManager));
    const actionExecutor = getComponent(initialComponents, 'actionExecutor', () => new ActionExecutor(memory, configManager));
    const perception = getComponent(initialComponents, 'perception', () => new Perception(memory, lm));
    const planner = getComponent(initialComponents, 'planner', () => new Planner(memory, lm, actionExecutor, configManager));
    const priorityManager = getComponent(initialComponents, 'priorityManager', () => new PriorityManager(memory, configManager));
    const contradictionAnalyzer = getComponent(initialComponents, 'contradictionAnalyzer', () => new ContradictionAnalyzer());
    const resolutionStrategy = getComponent(initialComponents, 'resolutionStrategy', () => new ResolutionStrategy());
    const metaCognition = getComponent(initialComponents, 'metaCognition', () => new MetaCognition(configManager, {
        contradictionAnalyzer,
        resolutionStrategy
    }));
    const cycle = getComponent(initialComponents, 'cycle', () => new Cycle(configManager, {
        memory,
        reasoner,
        lm,
        actionExecutor,
        perception,
        planner,
        metaCognition,
        temporalReasoner,
        priorityManager
    }));

    const components = {
        memory,
        reasoner,
        lm,
        actionExecutor,
        cycle,
        planner,
        metaCognition,
        perception,
        temporalReasoner,
        priorityManager,
        contradictionAnalyzer,
        resolutionStrategy,
    };

    const system = getComponent(initialComponents, 'system', () => new System(configManager, components));

    info('SystemFactory: Components assembled.');
    debug('SystemFactory: Returning system from assembleComponents:', system);
    return system;
};

const initializeSystem = async (system) => {
    info('SystemFactory: Initializing system with constitution...');
    debug('SystemFactory: System to initialize:', system);
    await system.initialize(CONSTITUTION_TASKS);
    info('SystemFactory: System initialized.');
    return system;
};

const createSystem = async (userConfig = {}, components = {}) => {
    return await errorHandler.safeAsync(async () => {
        info('SystemFactory: Creating new system...');
        debug('SystemFactory: User config:', userConfig);
        debug('SystemFactory: Initial components:', components);
        const configManager = new ConfigManager(userConfig);
        const system = assembleComponents(configManager, components);
        await initializeSystem(system);
        info('SystemFactory: System creation complete.');
        debug('SystemFactory: Returning system from createSystem:', system);
        return system;
    }, 'createSystem');
};

export default {
    createSystem
};