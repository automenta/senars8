// coreagent/compat/Events.js
export const SystemEvents = Object.freeze({
  // --- System Lifecycle ---
  SYSTEM_RESET: 'system:reset',
  SYSTEM_START: 'system:start',
  SYSTEM_STOP: 'system:stop',

  // --- Task Processing ---
  TASKS_ADD: 'tasks:add',
  TASK_ADD: 'task:add',
  TASK_REMOVE: 'task:remove',
  TASK_UPDATE: 'task:update',

  // --- Term Management ---
  TERM_ADD: 'term:add',
  TERM_REMOVE: 'term:remove',
  TERM_UPDATE: 'term:update',

  // --- Memory ---
  MEMORY_ADD: 'memory:add',
  MEMORY_REMOVE: 'memory:remove',
  MEMORY_UPDATE: 'memory:update',

  // --- Cognitive Cycle ---
  CYCLE_START: 'cycle:start',
  CYCLE_STEP: 'cycle:step',
  CYCLE_COMPLETE: 'cycle:complete',
  
  // --- Metrics ---
  METRICS_UPDATE: 'metrics:update',
});

// coreagent/compat/Commands.js
export const SystemCommands = Object.freeze({
  // --- System ---
  SYSTEM_ADD_TASKS: 'system:addTasks',
  SYSTEM_RESET: 'system:reset',
  SYSTEM_START_CYCLING: 'system:startCycling',
  SYSTEM_STOP_CYCLING: 'system:stopCycling',
  SYSTEM_GET_STATS: 'system:getStats',
  SYSTEM_GET_METRICS: 'system:getMetrics',

  // --- Reasoning (compatible with existing) ---
  REASONER_PROCESS_TASK: 'reasoner:processTask', // Keep existing name for compatibility

  // --- Memory (compatible with existing) ---
  MEMORY_GET_TASK: 'memory:getTask',
  MEMORY_GET_TERM: 'memory:getTerm',
  MEMORY_GET_ALL_TASKS: 'memory:getAllTasks',
  MEMORY_GET_ALL_TERMS: 'memory:getAllTerms',
  MEMORY_GET_HIGHEST_PRIORITY_TASKS: 'memory:getHighestPriorityTasks',
  MEMORY_GET_STATS: 'memory:getStats',

  // --- Action ---
  EXECUTE_ACTION: 'action:execute',
});