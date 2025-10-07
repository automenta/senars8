// Primary CoreAgent exports
export {System, createSystem, createCore, Core, Component, Config} from '../coreagent/index.js';

// CoreAgent utility functions
export {createTask, createBelief, createGoal, createQuestion, generateId, validateTask} from '../coreagent/utils.js';

// CoreAgent types are available through the main exports

// CoreAgent system components
export {Memory} from '../coreagent/Memory.js';
export {Reasoning} from '../coreagent/Reasoning.js';
export {Cycle} from '../coreagent/Cycle.js';
export {Rules} from '../coreagent/Rules.js';
export {Messages} from '../coreagent/Messages.js';
export {Plugins} from '../coreagent/Plugins.js';

// Core system exports for compatibility
export {default as Task} from './core/Task.js';
export {default as Term} from './core/Term.js';
export {default as BaseEntity} from './core/BaseEntity.js';
