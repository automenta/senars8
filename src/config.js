module.exports = {
    FOCUS_SET_SIZE: 20,
    META_TASK_PRIORITY: 0.9,
    ACTIONABLE_GOAL_PRIORITY_THRESHOLD: 0.5,
    MAX_GOALS_TO_EXECUTE: 3,
    RECENCY_DECAY_FACTOR: 10000,
    SIMILARITY_OFFSET: 0.1,
    SIMILARITY_SCALE: 1.1,
    LM_HYPOTHESIS_CONFIGS: [
        {type: 'general', num: 2},
        {type: 'creative', num: 1},
        {type: 'sophisticated', num: 1},
    ],
    ACTION_EXECUTOR: {
        RESOURCES: [
            { name: 'cpu', total: 100, unit: 'percent' },
            { name: 'memory', total: 8192, unit: 'MB' },
            { name: 'network', total: 1000, unit: 'Mbps' },
        ],
        CONSTRAINTS: {
            resource_limit: (action) => {
                if (action.resource_requirements) {
                    for (const req of action.resource_requirements) {
                        if (!this.resources.has(req.name)) {
                            console.warn(`Action ${action.name} requires unregistered resource: ${req.name}`);
                            return false;
                        }
                    }
                }
                return true;
            },
            safety: (action) => {
                const dangerousActions = ['delete_system', 'format_disk', 'shutdown_system'];
                return !dangerousActions.includes(action.name);
            },
        },
    },
};
