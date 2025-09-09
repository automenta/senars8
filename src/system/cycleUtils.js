const Task = require('../core/Task');

/**
 * Extracts unique term keys from tasks that don't already exist in memory
 * @param {Array} tasks - Array of tasks to process
 * @param {Memory} memory - Memory instance to check existing terms
 * @returns {Array} Array of new term keys
 */
function getNewTermKeys(tasks, memory) {
    return [...new Set(tasks.map(task => task.termKey).filter(termKey => !memory.getTerm(termKey)))];
}

/**
 * Bootstraps terms in batches
 * @param {Array} termKeys - Array of term keys to bootstrap
 * @param {LM} lm - Language model instance
 * @param {Memory} memory - Memory instance to add terms to
 * @param {object} config - Configuration object
 * @returns {Promise<void>}
 */
async function bootstrapTerms(termKeys, lm, memory, config) {
    const batchSize = config.system.BATCH_SIZE;
    for (let i = 0; i < termKeys.length; i += batchSize) {
        const batch = termKeys.slice(i, i + batchSize);
        const newTerms = await Promise.all(batch.map(termKey => lm.bootstrapTerm(termKey)));
        newTerms.forEach(term => memory.addTerm(term));
    }
}

/**
 * Gets prioritized goals from memory
 * @param {Memory} memory - Memory instance
 * @param {object} config - Configuration object
 * @returns {Array} Array of prioritized goals
 */
function getPrioritizedGoals(memory, config) {
    return Task.getGoalTasks(memory.getAllTasks())
        .filter(task => task.state.priority > config.ACTIONABLE_GOAL_PRIORITY_THRESHOLD)
        .slice(0, config.MAX_GOALS_TO_EXECUTE);
}

/**
 * Gets actionable goals from memory
 * @param {Memory} memory - Memory instance
 * @param {object} config - Configuration object
 * @returns {Array} Array of actionable goals
 */
function getActionableGoals(memory, config) {
    return Task.getGoalTasks(memory.getAllTasks())
        .filter(task => task.state.priority > config.ACTIONABLE_GOAL_PRIORITY_THRESHOLD)
        .slice(0, config.MAX_GOALS_TO_EXECUTE);
}

/**
 * Attempts to execute a plan
 * @param {Plan} plan - Plan to execute
 * @param {Task} goal - Goal task
 * @returns {Promise<object>} Execution result
 */
async function attemptPlanExecution(plan, goal) {
    if (plan && plan.steps.length > 0) {
        return await plan.execute().catch(error => ({
            success: false,
            task: goal.termKey,
            error: error.message,
            failedPlan: plan,
        }));
    }
    if (plan) { // Empty plan
        return {success: true, planId: plan.id, results: ['Goal already achieved']};
    }
    return {success: false, error: `No plan found for ${goal.termKey}`};
}

/**
 * Executes a goal plan with retry logic
 * @param {Planner} planner - Planner instance
 * @param {Task} goal - Goal task
 * @param {number} maxAttempts - Maximum number of attempts
 * @returns {Promise<object>} Execution result
 */
async function executeGoalPlan(planner, goal, maxAttempts = 3) {
    let result = {success: false};
    let attempts = 0;
    let lastFailedPlan = null;

    while (attempts < maxAttempts && !result.success) {
        attempts++;
        const plan = await planner.createPlan(goal, lastFailedPlan);
        result = await attemptPlanExecution(plan, goal);
        if (!result.success && result.failedPlan) {
            lastFailedPlan = result.failedPlan;
            delete result.failedPlan;
        } else if (!result.success) {
            break;
        }
    }
    return result;
}

module.exports = {
    getNewTermKeys,
    bootstrapTerms,
    getPrioritizedGoals,
    getActionableGoals,
    attemptPlanExecution,
    executeGoalPlan
};