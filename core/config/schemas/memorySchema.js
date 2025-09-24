export default {
    // Memory settings
    memory: {
        type: 'object',
        properties: {
            FORGETTING_STRATEGY_NAME: {
                type: 'string',
                enum: ['TimeBased'],
                default: 'TimeBased'
            },
            FORGETTING_STRATEGY_OPTIONS: {
                type: 'object'
            },
            MAINTENANCE_CYCLE_FREQUENCY: {
                type: 'number',
                min: 1,
                default: 10
            },
            CONSOLIDATION_PRIORITY_THRESHOLD: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.8
            },
            CONSOLIDATION_CONFIDENCE_THRESHOLD: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.9
            }
        },
        default: {
            FORGETTING_STRATEGY_NAME: 'TimeBased',
            FORGETTING_STRATEGY_OPTIONS: {
                shortTerm: {
                    expirationThreshold: BigInt(24) * BigInt(3600 * 1000),
                    importanceThresholds: {
                        priority: 0.7,
                        confidence: 0.7
                    }
                },
                longTerm: {
                    expirationThreshold: BigInt(30) * BigInt(24) * BigInt(3600 * 1000),
                    importanceThresholds: {
                        priority: 0.8,
                        confidence: 0.8
                    }
                }
            },
            MAINTENANCE_CYCLE_FREQUENCY: 10,
            CONSOLIDATION_PRIORITY_THRESHOLD: 0.8,
            CONSOLIDATION_CONFIDENCE_THRESHOLD: 0.9
        }
    },

    // Reasoner settings
    reasoner: {
        type: 'object',
        properties: {
            strategy: {
                type: 'string',
                enum: ['BagSampling', 'BruteForce'],
                default: 'BagSampling'
            }
        },
        default: {
            strategy: 'BagSampling'
        }
    }
};