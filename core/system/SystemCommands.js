/**
 * @fileoverview Centralized dictionary of all command types in the system.
 * This ensures consistency and prevents magic strings.
 *
 * A "Command" is a one-to-one, request-response interaction, telling a
 * specific part of the system to "do something" and return a result.
 */
export const SystemCommands = Object.freeze({
    // --- System ---
    SYSTEM_ADD_TASKS: 'system:addTasks',
    SYSTEM_RESET: 'system:reset',

    // --- Reasoner ---
    REASONER_PROCESS_TASK: 'reasoner:processTask',

    // --- Memory (for direct data retrieval) ---
    MEMORY_GET_TASK: 'memory:getTask',
    MEMORY_GET_TERM: 'memory:getTerm',
    MEMORY_GET_ALL_TASKS: 'memory:getAllTasks',
    MEMORY_GET_ALL_TERMS: 'memory:getAllTerms',

    // --- MetaCognition ---
    METACOGNITION_FIND_CONTRADICTIONS: 'metacognition:findContradictions',
    METACOGNITION_RESOLVE_CONTRADICTION: 'metacognition:resolveContradiction',
});