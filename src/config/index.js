import core from './core.js';
import lm from './lm.js';
import memory from './memory.js';
import planner from './planner.js';
import temporal from './temporal.js';
import system from './system.js';
import actionExecutor from './action-executor.js';

const config = {
    ...core,
    LM: lm,
    memory,
    planner,
    temporal,
    system,
    ACTION_EXECUTOR: actionExecutor,
};

export default config;