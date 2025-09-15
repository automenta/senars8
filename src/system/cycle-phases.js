import { safeAsync, safeSync } from '../utils/error-handler.js';

/**
 * Module containing the phase execution logic for the cognitive cycle
 */

/**
 * Runs the perception phase of the cycle
 * @param {Perception} perception - The perception instance
 * @returns {Promise<void>}
 */
export async function runPerceptionPhase(perception) {
    return await safeAsync(async() => {
        await perception.processEvents();
    }, 'Cycle.runPerceptionPhase');
}

/**
 * Runs the prioritization phase of the cycle
 * @param {object} context - The cycle context
 * @param {PriorityManager} priorityManager - The priority manager instance
 * @param {Memory} memory - The memory instance
 * @private
 */
export function runPrioritizationPhase(context, priorityManager, memory) {
    return safeSync(() => {
        const { currentTime, driveEmbeddings } = context;
        memory.getAllTasks().forEach(task => {
            task.state.priority = priorityManager.calculatePriority(task, currentTime, driveEmbeddings);
        });
    }, 'Cycle.runPrioritizationPhase');
}

/**
 * Resolves contradictions by generating meta tasks
 * @param {Array} contradictions - Array of contradictions to resolve
 * @param {EventBus} eventBus - The event bus instance
 * @param {object} config - Configuration object
 * @param {Memory} memory - Memory instance
 * @returns {Promise<Task[]>} Array of meta tasks
 */
async function resolveContradictions(contradictions, eventBus, config, memory) {
    return await safeAsync(async() => {
        const resolutionPromises = contradictions.map(contradiction =>
            eventBus.request('MetaCognition.resolve', {
                contradiction,
                strategy: 'auto'
            })
        );
        const resolvedTasksArray = await Promise.all(resolutionPromises);
        const metaTasks = resolvedTasksArray.flat().filter(Boolean);

        if (metaTasks.length > 0) {
            metaTasks.forEach(metaTask => metaTask.state.priority = config.META_TASK_PRIORITY);
            memory.addTasks(metaTasks);
        }
        return metaTasks;
    }, 'Cycle.resolveContradictions');
}

/**
 * Runs the meta-cognition phase of the cycle
 * @param {object} context - The cycle context
 * @param {EventBus} eventBus - The event bus instance
 * @param {object} config - Configuration object
 * @param {Memory} memory - Memory instance
 * @returns {Promise<object>} Object containing contradictions and meta tasks
 */
export async function runMetaCognitionPhase(context, eventBus, config, memory) {
    return await safeAsync(async() => {
        const { allTasks } = context;
        const contradictions = (await eventBus.request('MetaCognition.findContradictions', allTasks)) || [];
        const metaTasks = contradictions.length > 0 ? await resolveContradictions(contradictions, eventBus, config, memory) : [];
        return { contradictions, metaTasks };
    }, 'Cycle.runMetaCognitionPhase');
}

/**
 * Runs the reasoning phase of the cycle
 * @param {object} context - The cycle context
 * @param {Function} getFocusSet - Function to get the focus set
 * @param {Function} getPrioritizedGoals - Function to get prioritized goals
 * @param {TemporalReasoner} temporalReasoner - The temporal reasoner instance
 * @param {Function} performReasoning - Function to perform reasoning
 * @returns {Promise<Task[]>} Array of derived tasks
 */
export async function runReasoningPhase(context, getFocusSet, getPrioritizedGoals, temporalReasoner, performReasoning) {
    return await safeAsync(async() => {
        const { contradictions } = context;
        const focusSet = getFocusSet();
        if (focusSet.length === 0) {
            return [];
        }

        const goals = getPrioritizedGoals();
        const derivedTasks = await performReasoning(focusSet, goals, contradictions);
        // Note: Storing derived tasks is handled by the caller

        return derivedTasks;
    }, 'Cycle.runReasoningPhase');
}

/**
 * Runs the enrichment phase of the cycle
 * @param {object} context - The cycle context
 * @param {Function} getNewTermKeys - Function to get new term keys
 * @param {Function} bootstrapTerms - Function to bootstrap terms
 * @param {Function} proactiveEnrichment - Function to perform proactive enrichment
 * @returns {Promise<object>} Object containing proactive tasks
 */
export async function runEnrichmentPhase(context, getNewTermKeys, bootstrapTerms, proactiveEnrichment) {
    return await safeAsync(async() => {
        const { derivedTasks, metaTasks } = context;

        const newTermKeys = getNewTermKeys([...derivedTasks, ...metaTasks]);
        await bootstrapTerms(newTermKeys);

        return { proactiveTasks: await proactiveEnrichment() };
    }, 'Cycle.runEnrichmentPhase');
}

/**
 * Runs the action phase of the cycle
 * @param {Function} getActionableGoals - Function to get actionable goals
 * @param {Function} executeGoalPlan - Function to execute a goal plan
 * @returns {Promise<any[]>} Array of execution results
 */
export async function runActionPhase(getActionableGoals, executeGoalPlan) {
    return await safeAsync(async() => {
        const actionableGoals = getActionableGoals();
        const executionPromises = actionableGoals.map(goal => executeGoalPlan(goal));
        return Promise.all(executionPromises);
    }, 'Cycle.runActionPhase');
}
