/**
 * @fileoverview Centralized dictionary of all event types in the system.
 * This ensures consistency and prevents magic strings.
 *
 * An "Event" is a one-to-many, fire-and-forget broadcast, notifying the
 * system that "something happened."
 */
export const SystemEvents = Object.freeze({
    // --- System Lifecycle ---
    SYSTEM_RESET: 'system:reset',
    SYSTEM_START: 'system:start',
    SYSTEM_STOP: 'system:stop',

    // --- Task Processing ---
    TASKS_ADD: 'tasks:add', // For adding multiple tasks at once
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
});