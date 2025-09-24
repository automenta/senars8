export default {
    // Core settings
    FOCUS_SET_SIZE: {
        type: 'number',
        min: 1,
        max: 1000,
        default: 20
    },
    META_TASK_PRIORITY: {
        type: 'number',
        min: 0,
        max: 1,
        default: 0.9
    },
    ACTIONABLE_GOAL_PRIORITY_THRESHOLD: {
        type: 'number',
        min: 0,
        max: 1,
        default: 0.1
    },
    MAX_GOALS_TO_EXECUTE: {
        type: 'number',
        min: 1,
        max: 100,
        default: 3
    },
    RECENCY_DECAY_FACTOR: {
        type: 'number',
        min: 1,
        default: 10000
    },
    SIMILARITY_OFFSET: {
        type: 'number',
        min: 0,
        max: 1,
        default: 0.1
    },
    SIMILARITY_SCALE: {
        type: 'number',
        min: 0,
        default: 1.1
    },
    DEFAULT_TRUTH_VALUE: {
        type: 'object',
        properties: {
            frequency: {
                type: 'number',
                min: 0,
                max: 1,
                default: 1.0
            },
            confidence: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.9
            }
        },
        default: {
            frequency: 1.0,
            confidence: 0.9
        }
    },
    LM_HYPOTHESIS_CONFIGS: {
        type: 'array',
        default: [{
            type: 'general',
            num: 2
        }, {
            type: 'creative',
            num: 1
        }, {
            type: 'sophisticated',
            num: 1
        }]
    }
};