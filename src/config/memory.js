export default {
    FORGETTING_STRATEGY_NAME: 'TimeBased',
    FORGETTING_STRATEGY_OPTIONS: {
        shortTerm: {
            expirationThreshold: BigInt(24) * BigInt(3600 * 1000), // 1 day
            importanceThresholds: {
                priority: 0.7,
                confidence: 0.7
            }
        },
        longTerm: {
            expirationThreshold: BigInt(30) * BigInt(24) * BigInt(3600 * 1000), // 30 days
            importanceThresholds: {
                priority: 0.8,
                confidence: 0.8
            }
        }
    },
    MAINTENANCE_CYCLE_FREQUENCY: 10,
    CONSOLIDATION_PRIORITY_THRESHOLD: 0.8,
    CONSOLIDATION_CONFIDENCE_THRESHOLD: 0.9
};
