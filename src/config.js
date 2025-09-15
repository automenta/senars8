export default {
    FOCUS_SET_SIZE: 20,
    META_TASK_PRIORITY: 0.9,
    ACTIONABLE_GOAL_PRIORITY_THRESHOLD: 0.1,
    MAX_GOALS_TO_EXECUTE: 3,
    RECENCY_DECAY_FACTOR: 10000,
    SIMILARITY_OFFSET: 0.1,
    SIMILARITY_SCALE: 1.1,
    DEFAULT_TRUTH_VALUE: {
        frequency: 1.0,
        confidence: 0.9
    },
    LM_HYPOTHESIS_CONFIGS: [
        { type: 'general', num: 2 },
        { type: 'creative', num: 1 },
        { type: 'sophisticated', num: 1 }
    ],
    ACTION_EXECUTOR: {
        RESOURCES: [
            { name: 'cpu', total: 100, unit: 'percent' },
            { name: 'memory', total: 8192, unit: 'MB' },
            { name: 'network', total: 1000, unit: 'Mbps' }
        ],
        CONSTRAINTS: {
            resource_limit(action) {
                if (!action.resource_requirements) {
                    return true;
                }
                for (const req of action.resource_requirements) {
                    const resource = this.resources.get(req.name);
                    if (!resource) {
                        return false; // Fails if resource is not registered
                    }
                    const currentlyReserved = resource.reservations.reduce((acc, res) => acc + res.amount, 0);
                    if (currentlyReserved + req.amount > resource.total) {
                        return false; // Fails if resource is over-allocated
                    }
                }
                return true;
            },
            safety(action) {
                const dangerousActions = ['delete_system', 'format_disk', 'shutdown_system'];
                return !dangerousActions.includes(action.name);
            }
        }
    },
    LM: {
        FEATURE_EXTRACTION_MODEL: 'Xenova/all-MiniLM-L6-v2',
        TEXT_GENERATION_MODEL: 'Xenova/distilgpt2',
        QA_MODEL: 'Xenova/distilbert-base-uncased-distilled-squad',
        EMBEDDING_BATCH_SIZE: 10,
        EMBEDDING_BATCH_DELAY_MS: 100
    },
    planner: {
        strategy: 'HTN', // Can be 'AStar' or 'HTN'
        maxDepth: 10, // Maximum depth for HTN planning
        plannerConfig: {
            // A* specific configs
            heuristicWeights: {
                complexity: 0.4,
                confidence: 0.3,
                semantic: 0.3
            }
        }
    },
    memory: {
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
    },
    temporal: {
        REGULARITY_BOOST: 0.7,
        STRUCTURAL_SIMILARITY_WEIGHT: 0.3,
        TEMPORAL_CONFIDENCE: 0.9,
        TEMPORAL_RELATIONSHIP_FREQUENCY: 0.8,
        TEMPORAL_RELATIONSHIP_CONFIDENCE: 0.7,
        MEETS_IMPLICATION_FREQUENCY: 0.9,
        MEETS_IMPLICATION_CONFIDENCE: 0.8,
        OVERLAP_IMPLICATION_FREQUENCY: 0.8,
        OVERLAP_IMPLICATION_CONFIDENCE: 0.7,
        SEQUENCE_CONFIDENCE_DECAY: 0.9,
        PERIODIC_CONFIDENCE: 0.8,
        TEMPORAL_SUMMARY_CONFIDENCE: 0.9,
        PREDICTION_CONFIDENCE: 0.5,
        MAX_COMPARISONS: 1000 // Maximum number of comparisons for temporal reasoning
    },
    system: {
        BATCH_SIZE: 10, // Batch size for term bootstrapping
        CONFIDENCE_REDUCTION_FACTOR: 0.1 // Factor by which to reduce confidence during revision
    }
};
