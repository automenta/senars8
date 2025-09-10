import Memory from '../memory/Memory.js';
import Reasoner from '../reasoner/Reasoner.js';
import TemporalReasoner from '../reasoner/TemporalReasoner.js';
import LM from '../lm/LM.js';
import Cycle from './Cycle.js';
import ActionExecutor from './ActionExecutor.js';
import System from './System.js';
import config from '../config.js';

class SystemFactory {
    static createSystem(userConfig = {}) {
        const mergedConfig = { ...config, ...userConfig };

        const memory = new Memory();
        const temporalReasoner = new TemporalReasoner();
        const reasoner = new Reasoner({ temporalReasoner });
        const lm = new LM();
        const actionExecutor = new ActionExecutor(memory);
        const cycle = new Cycle(memory, reasoner, lm, actionExecutor, mergedConfig);

        return System.create(userConfig, {
            memory,
            reasoner,
            lm,
            actionExecutor,
            cycle,
            temporalReasoner
        });
    }
}

export default SystemFactory;
