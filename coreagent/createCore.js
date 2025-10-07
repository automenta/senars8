import createCoreInstance from './Core.js';
import Memory from './Memory.js';
import Reasoning from './Reasoning.js';
import Cycle from './Cycle.js';
import Self from './Self.js';
import Plugins from './Plugins.js';
import LM from './lm/LM.js';
import {NarseseParser} from './parser/narseseParser.js';
import ToolSystem from './tools/ToolSystem.js';

export function createCore(configData = {}) {
    const core = createCoreInstance(configData);

    // Add default middleware that uses the core's own facilities
    core.messages?.use(async (type, data, next) => {
        const ruleResults = core.evaluateRules({type, data});

        for (const result of ruleResults) {
            if (result.action && result.target) {
                core.emit(result.target, result.payload);
            }
        }

        const result = await next(data);

        if (core.config.getBoolean('DEBUG_LOGGING', false)) {
            core.emit('system:debug', {type, data, timestamp: Date.now()});
        }

        return result;
    });

    // Register all components
    core
        .register('memory', new Memory(core))
        .register('reasoning', new Reasoning(core))
        .register('cycle', new Cycle(core))
        .register('self', new Self(core))
        .register('plugins', new Plugins(core))
        .register('lm', new LM(core))
        .register('parser', new NarseseParser(core))
        .register('tools', new ToolSystem(core));

    return core;
}