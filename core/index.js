// Re-export everything from coreagent for backward compatibility
// TODO: Consider removing this file and updating imports to use '../coreagent/index.js' directly
export * from '../coreagent/index.js';

// Core system exports for compatibility
export {default as Task} from './core/Task.js';
export {default as Term} from './core/Term.js';
export {default as BaseEntity} from './core/BaseEntity.js';
