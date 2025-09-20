import {
    createModuleErrorHandler
} from '../utils/errorHandler.js';
import {
    debug,
    info
} from '../utils/logger.js'; // Added debug import
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

class SystemFactory {
    _assembleComponents(configManager, initialComponents) {
        info('SystemFactory: Assembling components...');
        debug('SystemFactory: Components received:', initialComponents);

        const get = (name, defaultComponent) => {
            const component = initialComponents[name] || defaultComponent;
            debug(`SystemFactory: Assembled component ${name}:`, component);
            return component;
        };

        const memory = get('memory', new Memory(configManager));
        const lm = get('lm', new LM(configManager));
        const temporalReasoner = get('temporalReasoner', new TemporalReasoner(configManager));
        const reasoner = get('reasoner', new Reasoner({
            temporalReasoner
        }, configManager));
        const actionExecutor = get('actionExecutor', new ActionExecutor(memory, configManager));
        const perception = get('perception', new Perception(memory, lm));
        const planner = get('planner', new Planner(memory, lm, actionExecutor, configManager));
        const priorityManager = get('priorityManager', new PriorityManager(memory, configManager));
        const contradictionAnalyzer = get('contradictionAnalyzer', new ContradictionAnalyzer());
        const resolutionStrategy = get('resolutionStrategy', new ResolutionStrategy());
        const metaCognition = get('metaCognition', new MetaCognition(configManager, {
            contradictionAnalyzer,
            resolutionStrategy
        }));
        const cycle = get('cycle', new Cycle(configManager, {
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

        const system = get('system', new System(configManager, components));

        info('SystemFactory: Components assembled.');
        debug('SystemFactory: Returning system from _assembleComponents:', system);
        return system;
    }

    async _initializeSystem(system) {
        info('SystemFactory: Initializing system with constitution...');
        debug('SystemFactory: System to initialize:', system);
        await system.initialize(CONSTITUTION_TASKS);
        info('SystemFactory: System initialized.');
        return system;
    }

    async createSystem(userConfig = {}, components = {}) {
        return await errorHandler.safeAsync(async () => {
            info('SystemFactory: Creating new system...');
            debug('SystemFactory: User config:', userConfig);
            debug('SystemFactory: Initial components:', components);
            const configManager = new ConfigManager(userConfig);
            const system = this._assembleComponents(configManager, components);
            await this._initializeSystem(system);
            info('SystemFactory: System creation complete.');
            debug('SystemFactory: Returning system from createSystem:', system);
            return system;
        }, 'createSystem');
    }
}

export default new SystemFactory();