/**
 * Test Data Factory - Centralized test data creation utilities
 * Provides consistent and reusable test data creation with sensible defaults
 */

import {vi} from 'vitest';
import Term from '../core/core/Term.js';
import Task from '../core/core/Task.js';

// Default configurations for test data
const DEFAULT_CONFIGS = {
    TASK: {
        punctuation: '.',
        truth: [1.0, 0.9],
        priority: 0
    },
    TERM: {
        complexity: 1,
        embedding: [0.1, 0.2, 0.3]
    },
    SYSTEM: {
        reasoner: {
            strategy: 'BruteForce'
        }
    }
};

/**
 * Creates a task definition object for testing
 * @param {string} sentence - The Narsese sentence
 * @param {string} punctuation - The punctuation mark (default: '.')
 * @param {Array} truth - Truth values as [frequency, confidence] (default: [1.0, 0.9])
 * @param {object} options - Additional options for the task
 * @returns {object} Task definition object
 */
export const createTaskDef = (sentence, punctuation = DEFAULT_CONFIGS.TASK.punctuation, truth = DEFAULT_CONFIGS.TASK.truth, options = {}) => {
    return {
        sentence,
        punctuation,
        truth,
        ...options
    };
};

/**
 * Creates a term definition object for testing
 * @param {string} key - The term key
 * @param {Array} embedding - The embedding array (default: [0.1, 0.2, 0.3])
 * @param {number} complexity - The complexity value (default: 1)
 * @param {object} options - Additional options for the term
 * @returns {object} Term definition object
 */
export const createTermDef = (key, embedding = DEFAULT_CONFIGS.TERM.embedding, complexity = DEFAULT_CONFIGS.TERM.complexity, options = {}) => {
    return {
        key,
        embedding,
        complexity,
        ...options
    };
};

/**
 * Creates a system configuration object for testing
 * @param {object} overrides - Configuration overrides
 * @returns {object} System configuration object
 */
export const createSystemConfig = (overrides = {}) => {
    return {
        ...DEFAULT_CONFIGS.SYSTEM,
        ...overrides
    };
};

/**
 * Creates a Task instance for testing
 * @param {string|Term} termOrKey - Either a Term instance or a string key for the term
 * @param {string} punctuation - The punctuation mark (default: '.')
 * @param {object} truthValue - Truth value object with frequency and confidence (default: {frequency: 1.0, confidence: 0.9})
 * @param {object} stamp - Stamp object (default: null)
 * @param {object} options - Additional options for the task
 * @returns {Task} Task instance
 */
export const createTask = (termOrKey, punctuation = DEFAULT_CONFIGS.TASK.punctuation, truthValue = null, stamp = null, options = {}) => {
    const term = typeof termOrKey === 'string' ? new Term(termOrKey) : termOrKey;
    const defaultTruthValue = truthValue || {
        frequency: DEFAULT_CONFIGS.TASK.truth[0],
        confidence: DEFAULT_CONFIGS.TASK.truth[1]
    };

    return new Task(term, punctuation, defaultTruthValue, stamp, options);
};

/**
 * Creates a Term instance for testing
 * @param {string} key - The term key
 * @param {Array} embedding - The embedding array (default: [0.1, 0.2, 0.3])
 * @param {number} complexity - The complexity value (default: 1)
 * @param {object} options - Additional options for the term
 * @returns {Term} Term instance
 */
export const createTerm = (key, embedding = DEFAULT_CONFIGS.TERM.embedding, complexity = DEFAULT_CONFIGS.TERM.complexity, options = {}) => {
    return new Term(key, embedding, complexity, options);
};

/**
 * Creates a complex term structure for testing inheritance relationships
 * @param {string} subjectKey - The subject term key
 * @param {string} predicateKey - The predicate term key
 * @param {string} relation - The relation type (default: '-->')
 * @returns {object} Complex term structure
 */
export const createComplexTerm = (subjectKey, predicateKey, relation = '-->') => {
    return {
        type: 'Inheritance',
        subject: createTermDef(subjectKey),
        predicate: createTermDef(predicateKey),
        relation
    };
};

/**
 * Creates a test scenario template with predefined data
 * @param {string} name - Name of the scenario
 * @param {object} config - Scenario configuration
 * @returns {object} Scenario template
 */
export const createScenario = (name, config) => {
    return {
        name,
        config,
        tasks: [],
        terms: [],
        ...config
    };
};

/**
 * Predefined test scenarios for common patterns
 */
export const TEST_SCENARIOS = {
    BASIC_TASK: () => ({
        task: createTaskDef('(cat --> animal)', '.', [0.8, 0.9])
    }),

    INHERITANCE_TASK: () => ({
        subjectTask: createTaskDef('(cat --> animal)', '.', [0.8, 0.9]),
        predicateTask: createTaskDef('(dog --> animal)', '.', [0.7, 0.85])
    }),

    DEDUCTION: () => ({
        premise1: createTaskDef('(bird --> animal)', '.', [0.9, 0.8]),
        premise2: createTaskDef('(animal --> living_thing)', '.', [0.95, 0.85]),
        expected: createTaskDef('(bird --> living_thing)', '.', [0.85, 0.72])
    }),

    TEMPORAL_SEQUENCE: () => ({
        first: createTaskDef('(A --> state)', '.', [1.0, 0.9]),
        second: createTaskDef('(B --> state)', '.', [1.0, 0.9]),
        temporalRelation: '&/ A B'  // Sequential relation
    })
};

/**
 * Creates a test data template with multiple related entities
 * @param {string} templateName - Name of the template to use
 * @returns {object} Pre-configured test data
 */
export const createTestDataTemplate = (templateName) => {
    switch (templateName) {
        case 'basic':
            return {
                term: createTerm('cat'),
                task: createTask('cat', '.', {frequency: 1.0, confidence: 0.9})
            };
        case 'inheritance':
            return {
                subjectTerm: createTerm('cat'),
                predicateTerm: createTerm('animal'),
                inheritanceTerm: createTerm('(cat --> animal)'),
                subjectTask: createTask('cat', '.', {frequency: 0.8, confidence: 0.9}),
                predicateTask: createTask('animal', '.', {frequency: 1.0, confidence: 0.9}),
                inheritanceTask: createTask('(cat --> animal)', '.', {frequency: 0.8, confidence: 0.7})
            };
        case 'deduction':
            return {
                premiseA: createTask('bird', '.', {frequency: 0.9, confidence: 0.8}),
                premiseB: createTask('animal', '.', {frequency: 1.0, confidence: 0.9}),
                conclusion: createTask('(bird --> animal)', '.', {frequency: 0.9, confidence: 0.72}),
                complexTerm: createTerm('(bird --> animal)')
            };
        default:
            return {};
    }
};


// Export default configuration for reference
export const DEFAULT_TEST_CONFIGS = DEFAULT_CONFIGS;