export default {
    // Planner settings
    planner: {
        type: 'object',
        properties: {
            strategy: {
                type: 'string',
                enum: ['HTN', 'AStar'],
                default: 'HTN'
            },
            maxDepth: {
                type: 'number',
                min: 1,
                max: 100,
                default: 10
            },
            plannerConfig: {
                type: 'object'
            }
        },
        default: {
            strategy: 'HTN',
            maxDepth: 10,
            plannerConfig: {
                heuristicWeights: {
                    complexity: 0.4,
                    confidence: 0.3,
                    semantic: 0.3
                }
            }
        }
    },

    // Temporal reasoning settings
    temporal: {
        type: 'object',
        properties: {
            REGULARITY_BOOST: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.7
            },
            STRUCTURAL_SIMILARITY_WEIGHT: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.3
            },
            TEMPORAL_CONFIDENCE: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.9
            },
            TEMPORAL_RELATIONSHIP_FREQUENCY: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.8
            },
            TEMPORAL_RELATIONSHIP_CONFIDENCE: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.7
            },
            MEETS_IMPLICATION_FREQUENCY: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.9
            },
            MEETS_IMPLICATION_CONFIDENCE: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.8
            },
            OVERLAP_IMPLICATION_FREQUENCY: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.8
            },
            OVERLAP_IMPLICATION_CONFIDENCE: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.7
            },
            SEQUENCE_CONFIDENCE_DECAY: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.9
            },
            PERIODIC_CONFIDENCE: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.8
            },
            TEMPORAL_SUMMARY_CONFIDENCE: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.9
            },
            PREDICTION_CONFIDENCE: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.5
            },
            MAX_COMPARISONS: {
                type: 'number',
                min: 1,
                default: 1000
            }
        },
        default: {
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
            MAX_COMPARISONS: 1000
        }
    }
};