/**
 * Global Test Constants
 * Consolidated constants used across all test files
 */

export const TEST_CONSTANTS = {
    TIMEOUTS: {
        DEFAULT: 5000,
        LONG: 10000,
        VERY_LONG: 30000,
        EXTRA_LONG: 300000,
        MAX_LONG: 600000
    },

    PUNCTUATIONS: {
        BELIEF: '.',
        GOAL: '!',
        QUESTION: '?'
    },

    DEFAULT_TRUTH_VALUES: {
        HIGH: {frequency: 1.0, confidence: 0.9},
        MEDIUM_HIGH: {frequency: 0.9, confidence: 0.85},
        MEDIUM: {frequency: 0.8, confidence: 0.85},
        MEDIUM_LOW: {frequency: 0.7, confidence: 0.8},
        LOW: {frequency: 0.5, confidence: 0.7},
        VERY_LOW: {frequency: 0.1, confidence: 0.2}
    },

    TRUTH_VALUE_PRESETS: {
        DEFAULT: [1.0, 0.9],
        MEDIUM_HIGH: [0.9, 0.85],
        MEDIUM: [0.8, 0.9],
        MEDIUM_LOW: [0.7, 0.85],
        LOW: [0.5, 0.7],
        VERY_LOW: [0.1, 0.2],
        MINIMAL: [0.0, 0.0]
    },

    DEFAULT_PRIORITY: {
        LOW: 0.1,
        MEDIUM: 0.5,
        HIGH: 0.9
    },

    PRIORITY_PRESETS: {
        DEFAULT: 0,
        LOW: 0.1,
        MEDIUM: 0.5,
        HIGH: 0.8,
        VERY_HIGH: 0.95
    },

    TASK_TYPES: {
        BELIEF: 'belief',
        GOAL: 'goal',
        QUESTION: 'question'
    },

    DEFAULT_EMBEDDING: [0.1, 0.2, 0.3],

    EMBEDDING_PRESETS: {
        DEFAULT: [0.1, 0.2, 0.3],
        SIMILAR_1: [0.1, 0.2, 0.3],
        SIMILAR_2: [0.11, 0.21, 0.31],
        OPPOSITE: [0.9, 0.8, 0.7],
        RANDOM_LOW: [0.4, 0.5, 0.6],
        RANDOM_HIGH: [0.8, 0.9, 0.7]
    },

    // TERM_TYPES: Use the existing OP constants from core/config/constants.js

    TERM_PRESETS: {
        DEFAULT_COMPLEXITY: 1,
        ATOMIC: 'cat',
        INHERITANCE: '(cat --> animal)',
        SIMILAR_SUBJECT: '(dog --> animal)',
        IMPLICATION: '(cat ==> mammal)',
        CONJUNCTION: '(&&, cat dog)'
    },

    MOCK_NAMES: {
        COMMAND_BUS: 'commandBus',
        EVENT_BUS: 'eventBus',
        MEMORY: 'memory',
        REASONER: 'reasoner',
        TERM: 'term',
        TASK: 'task',
        SYSTEM: 'system'
    },

    BATCH_PRESETS: {
        DEFAULT_SIZE: 10,
        SMALL: 5,
        LARGE: 50
    },

    TIME_PRESETS: {
        DEFAULT_EXPIRATION_MS: 24 * 3600 * 1000, // 1 day in ms
        LONG_EXPIRATION_MS: 30 * 24 * 3600 * 1000, // 30 days in ms
        DEFAULT_IMPORTANCE_THRESHOLD: 0.5,
        HIGH_IMPORTANCE_THRESHOLD: 0.8,
        VERY_HIGH_IMPORTANCE_THRESHOLD: 0.95
    }
};