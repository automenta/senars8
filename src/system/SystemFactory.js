import {createModuleErrorHandler} from '../utils/errorHandler.js';
import {info} from '../utils/logger.js';
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
    async createSystem(userConfig = {}, components = {}) {
        return await errorHandler.safeAsync(async () => {
            info('SystemFactory: Creating new system...');
            const configManager = new ConfigManager(userConfig);
            const assembledComponents = this._assembleComponents(configManager, components);
            const system = await this._initializeSystem(assembledComponents);
            info('SystemFactory: System creation complete.');
            return system;
        }, 'createSystem');
    }

    _assembleComponents(configManager, components) {
        info('SystemFactory: Assembling components...');
        const memory = components.memory || new Memory(configManager);
        const lm = components.lm || new LM(configManager);
        const temporalReasoner = components.temporalReasoner || new TemporalReasoner(configManager);
        const reasoner = components.reasoner || new Reasoner({
            temporalReasoner
        }, configManager);
        const actionExecutor = components.actionExecutor || new ActionExecutor(memory, configManager);
        const perception = components.perception || new Perception(memory, lm);
        const planner = components.planner || new Planner(memory, lm, actionExecutor, configManager);
        const priorityManager = components.priorityManager || new PriorityManager(memory);
        const contradictionAnalyzer = components.contradictionAnalyzer || new ContradictionAnalyzer();
        const resolutionStrategy = components.resolutionStrategy || new ResolutionStrategy();
        const metaCognition = components.metaCognition || new MetaCognition(configManager, {
            contradictionAnalyzer,
            resolutionStrategy
        });
        const cycle = components.cycle || new Cycle(configManager, {
            memory,
            reasoner,
            lm,
            actionExecutor,
            perception,
            planner,
            metaCognition,
            temporalReasoner,
            priorityManager
        });
        const system = components.system || new System(configManager, {
            memory,
            reasoner,
            lm,
            actionExecutor,
            cycle
        });
        info('SystemFactory: Components assembled.');
        return {
            system,
            ...components
        };
    }

    async _initializeSystem(components) {
        info('SystemFactory: Initializing system with constitution...');
        await components.system.initialize(CONSTITUTION_TASKS);
        info('SystemFactory: System initialized.');
        return components.system;
    }
}

export default new SystemFactory();
