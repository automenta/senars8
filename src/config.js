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
};
