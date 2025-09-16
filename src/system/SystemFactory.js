import _ from 'lodash';
import {safeAsync} from '../utils/error-handler.js';
import {info} from '../utils/logger.js';

// Core Components
import System from './System.js';
import Cycle from './Cycle.js';
import Memory from '../memory/Memory.js';
import Reasoner from '../reasoner/Reasoner.js';
import LM from '../lm/LM.js';
import ActionExecutor from './ActionExecutor.js';

// Cycle Sub-components
import Perception from './Perception.js';
import Planner from './Planner.js';
import MetaCognition from './MetaCognition.js';
import TemporalReasoner from '../reasoner/TemporalReasoner.js';
import PriorityManager from '../reasoner/PriorityManager.js';

// MetaCognition Sub-components
import ContradictionAnalyzer from '../reasoner/ContradictionAnalyzer.js';
import ResolutionStrategy from '../reasoner/strategies/ResolutionStrategy.js';


// Configuration and initial data
import defaultConfig from '../config/default-config.js';
import CONSTITUTION_TASKS from './Constitution.js';

/**
 * SystemFactory is responsible for assembling and initializing a complete SeNARS system.
 * It uses a dependency injection pattern to construct the system from its constituent components.
 */
class SystemFactory {
    /**
     * Creates and initializes a new System instance.
     * This method assembles all the necessary components, injects dependencies,
     * and initializes the system with its constitutional drives.
     *
     * @param {object} [userConfig={}] - User-provided configuration to override defaults.
     * @param {object} [components={}] - Pre-instantiated components for testing or custom setups.
     * @returns {Promise<System>} A promise that resolves to the fully initialized system.
     */
    async createSystem(userConfig = {}, components = {}) {
        return await safeAsync(async () => {
            info('SystemFactory: Creating new system...');

            // 1. Configure
            info('SystemFactory: Merging configurations...');
            const config = _.merge({}, defaultConfig, userConfig);
            info('SystemFactory: Configuration merged.');

            // 2. Assemble Components
            info('SystemFactory: Assembling components...');
            const memory = components.memory || new Memory(config.memory);
            const lm = components.lm || new LM(config.LM);
            const temporalReasoner = components.temporalReasoner || new TemporalReasoner(config.temporal);
            const reasoner = components.reasoner || new Reasoner({temporalReasoner}, config.reasoner);
            const actionExecutor = components.actionExecutor || new ActionExecutor(memory, config.ACTION_EXECUTOR);

            // Cycle-specific components
            const perception = components.perception || new Perception(memory, lm);
            const planner = components.planner || new Planner(memory, lm, actionExecutor, config.planner);

            // MetaCognition and its dependencies
            const contradictionAnalyzer = components.contradictionAnalyzer || new ContradictionAnalyzer();
            const resolutionStrategy = components.resolutionStrategy || new ResolutionStrategy();
            const metaCognition = components.metaCognition || new MetaCognition(config, {
                contradictionAnalyzer,
                resolutionStrategy
            });

            const priorityManager = components.priorityManager || new PriorityManager(memory);

            const cycle = components.cycle || new Cycle(config, {
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

            const system = components.system || new System(config, {
                memory,
                reasoner,
                lm,
                actionExecutor,
                cycle
            });
            info('SystemFactory: Components assembled.');


            // 3. Initialize
            info('SystemFactory: Initializing system with constitution...');
            await system.initialize(CONSTITUTION_TASKS);
            info('SystemFactory: System creation complete.');
            return system;
        }, 'SystemFactory.createSystem');
    }
}

export default new SystemFactory();
