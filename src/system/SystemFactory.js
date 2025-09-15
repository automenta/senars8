import _ from 'lodash';
import {safeAsync} from '../utils/error-handler.js';
import {info} from '../utils/logger.js';

import Memory from '../memory/Memory.js';
import Reasoner from '../reasoner/Reasoner.js';
import TemporalReasoner from '../reasoner/TemporalReasoner.js';
import LM from '../lm/LM.js';
import Cycle from './Cycle.js';
import ActionExecutor from './ActionExecutor.js';
import System from './System.js';
import CONSTITUTION_TASKS from './Constitution.js';
import config from '../config/index.js';

class SystemFactory {
    /**
     * Creates and initializes a new System instance
     * @param {object} [userConfig={}] - User-provided configuration
     * @param {object} [dependencies={}] - Dependency injection for testing
     * @returns {Promise<System>} A promise that resolves to the initialized system
     */
    async createSystem(userConfig = {}, dependencies = {}) {
        return await safeAsync(async () => {
            info('SystemFactory: Creating new system...');
            const mergedConfig = _.merge({}, config, userConfig);

            const memory = dependencies.memory || new Memory();
            const temporalReasoner = dependencies.temporalReasoner || new TemporalReasoner();
            const reasoner = dependencies.reasoner || new Reasoner({temporalReasoner});
            const lm = dependencies.lm || new LM();
            const actionExecutor = dependencies.actionExecutor || new ActionExecutor(memory);
            const cycle = dependencies.cycle || new Cycle(memory, reasoner, lm, actionExecutor, mergedConfig);

            const system = new System(mergedConfig, {memory, reasoner, lm, actionExecutor, cycle});

            info('SystemFactory: Initializing system...');
            await system.initialize(CONSTITUTION_TASKS);
            info('SystemFactory: System creation complete');
            return system;
        }, 'SystemFactory.createSystem');
    }
}

export default new SystemFactory();
