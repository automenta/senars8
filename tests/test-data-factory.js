/**
 * Unified Data Factory
 * High-performance test data creation with caching and deduplication
 */

import Term from '../core/core/Term.js';
import Task from '../core/core/Task.js';
import {SYSTEM_CONSTANTS} from '../core/config/constants.js';
import {TEST_CONSTANTS} from './test-constants.js';

// Unified data creation API
const createData = (type, ...args) => DataFactory.create(type, ...args);

// Register core data templates
const DataFactory = {
    templates: new Map(),

    register: (name, template) => DataFactory.templates.set(name, template),

    create: (templateName, ...args) => {
        const template = DataFactory.templates.get(templateName);
        if (!template) throw new Error(`Unknown data template: ${templateName}`);
        return template(...args);
    }
};

DataFactory.register('taskDef', (sentence, punctuation = '.', truth = TEST_CONSTANTS.TRUTH_VALUE_PRESETS.DEFAULT, options = {}) => ({
    sentence, punctuation, truth, ...options
}));

DataFactory.register('termDef', (key, embedding = SYSTEM_CONSTANTS.DEFAULT_EMBEDDING, complexity = SYSTEM_CONSTANTS.DEFAULT_COMPLEXITY, options = {}) => ({
    key, embedding, complexity, ...options
}));

DataFactory.register('systemConfig', (overrides = {}) => ({
    reasoner: {strategy: 'BruteForce'},
    ...overrides
}));

DataFactory.register('task', (termOrKey, punctuation = '.', truthValue = null, stamp = null, options = {}) => {
    const term = typeof termOrKey === 'string' ? new Term(termOrKey) : termOrKey;
    const defaultTruthValue = truthValue || SYSTEM_CONSTANTS.DEFAULT_TRUTH_VALUES.HIGH;
    return new Task(term, punctuation, defaultTruthValue, stamp, options);
});

DataFactory.register('term', (key, embedding = SYSTEM_CONSTANTS.DEFAULT_EMBEDDING, complexity = SYSTEM_CONSTANTS.DEFAULT_COMPLEXITY, options = {}) =>
    new Term(key, embedding, complexity, options));

DataFactory.register('complexTerm', (subjectKey, predicateKey, relation = '-->') => ({
    type: 'Inheritance',
    subject: DataFactory.create('termDef', subjectKey),
    predicate: DataFactory.create('termDef', predicateKey),
    relation
}));

// Specialized creators for common data types
export const createTaskDef = (...args) => createData('taskDef', ...args);
export const createTermDef = (...args) => createData('termDef', ...args);
export const createSystemConfig = (...args) => createData('systemConfig', ...args);
export const createTask = (...args) => createData('task', ...args);
export const createTerm = (...args) => createData('term', ...args);
export const createComplexTerm = (...args) => createData('complexTerm', ...args);

// Batch data creation for performance
export const createBatch = (type, items) => items.map(args => createData(type, ...args));

// Predefined data sets for common scenarios
export const createScenario = (name, config) => ({
    name, config, tasks: [], terms: [], ...config
});

export const TEST_SCENARIOS = {
    BASIC_TASK: () => createTaskDef('(cat --> animal)', '.', TEST_CONSTANTS.TRUTH_VALUE_PRESETS.MEDIUM),

    INHERITANCE_TASK: () => ({
        subjectTask: createTaskDef('(cat --> animal)', '.', TEST_CONSTANTS.TRUTH_VALUE_PRESETS.MEDIUM),
        predicateTask: createTaskDef('(dog --> animal)', '.', TEST_CONSTANTS.TRUTH_VALUE_PRESETS.MEDIUM_LOW)
    }),

    DEDUCTION: () => ({
        premise1: createTaskDef('(bird --> animal)', '.', TEST_CONSTANTS.TRUTH_VALUE_PRESETS.MEDIUM_HIGH),
        premise2: createTaskDef('(animal --> living_thing)', '.', TEST_CONSTANTS.TRUTH_VALUE_PRESETS.MEDIUM_LOW),
        expected: createTaskDef('(bird --> living_thing)', '.', [0.85, 0.72])
    }),

    TEMPORAL_SEQUENCE: () => ({
        first: createTaskDef('(A --> state)', '.', TEST_CONSTANTS.TRUTH_VALUE_PRESETS.DEFAULT),
        second: createTaskDef('(B --> state)', '.', TEST_CONSTANTS.TRUTH_VALUE_PRESETS.DEFAULT),
        temporalRelation: '&/ A B'
    })
};

// Template-based data creation
export const createTestDataTemplate = (templateName) => {
    const templates = {
        basic: () => ({
            term: createTerm('cat'),
            task: createTask('cat', '.', SYSTEM_CONSTANTS.DEFAULT_TRUTH_VALUES.HIGH)
        }),
        inheritance: () => ({
            subjectTerm: createTerm('cat'),
            predicateTerm: createTerm('animal'),
            inheritanceTerm: createTerm('(cat --> animal)'),
            subjectTask: createTask('cat', '.', SYSTEM_CONSTANTS.DEFAULT_TRUTH_VALUES.MEDIUM),
            predicateTask: createTask('animal', '.', SYSTEM_CONSTANTS.DEFAULT_TRUTH_VALUES.HIGH),
            inheritanceTask: createTask('(cat --> animal)', '.', SYSTEM_CONSTANTS.DEFAULT_TRUTH_VALUES.MEDIUM_LOW)
        }),
        deduction: () => ({
            premiseA: createTask('bird', '.', SYSTEM_CONSTANTS.DEFAULT_TRUTH_VALUES.MEDIUM_HIGH),
            premiseB: createTask('animal', '.', SYSTEM_CONSTANTS.DEFAULT_TRUTH_VALUES.HIGH),
            conclusion: createTask('(bird --> animal)', '.', {frequency: 0.9, confidence: 0.72}),
            complexTerm: createTerm('(bird --> animal)')
        })
    };

    const template = templates[templateName];
    return template ? template() : {};
};

// Data generation utilities
export const generateTaskSeries = (baseSentence, count, variations = []) => {
    const tasks = [];
    for (let i = 0; i < count; i++) {
        const variation = variations[i] || '';
        const sentence = baseSentence.replace('{i}', i).replace('{variation}', variation);
        tasks.push(createTaskDef(sentence, '.', [0.8 + Math.random() * 0.2, 0.8 + Math.random() * 0.2]));
    }
    return tasks;
};

export const generateTermVariations = (baseKey, count, embeddingSize = 3) => {
    const terms = [];
    for (let i = 0; i < count; i++) {
        const embedding = Array.from({length: embeddingSize}, () => Math.random());
        terms.push(createTermDef(`${baseKey}_${i}`, embedding, 1 + Math.floor(Math.random() * 3)));
    }
    return terms;
};

// Test data sets for common scenarios
export const TEST_DATA_SETS = {
    TASK_PROCESSING: [
        {
            name: 'basic task processing',
            input: {sentence: '(cat --> animal)', punctuation: '.', truth: TEST_CONSTANTS.TRUTH_VALUE_PRESETS.MEDIUM},
            expected: {success: true, resultType: 'processed'}
        },
        {
            name: 'complex inheritance task',
            input: {sentence: '((cat --> animal) && (animal --> living))', punctuation: '.', truth: TEST_CONSTANTS.TRUTH_VALUE_PRESETS.MEDIUM_LOW},
            expected: {success: true, resultType: 'inference'}
        },
        {
            name: 'invalid task format',
            input: {sentence: 'invalid format', punctuation: '?', truth: TEST_CONSTANTS.TRUTH_VALUE_PRESETS.MINIMAL},
            expected: {success: false, errorType: 'ValidationError'}
        }
    ],

    REASONING_INFERENCES: [
        {
            name: 'deduction',
            premises: [
                {sentence: '(bird --> animal)', truth: TEST_CONSTANTS.TRUTH_VALUE_PRESETS.MEDIUM_HIGH},
                {sentence: '(animal --> living_thing)', truth: TEST_CONSTANTS.TRUTH_VALUE_PRESETS.MEDIUM_LOW}
            ],
            expected: {conclusion: '(bird --> living_thing)', truth: [0.85, 0.72]}
        },
        {
            name: 'induction',
            premises: [
                {sentence: '(robin --> bird)', truth: TEST_CONSTANTS.TRUTH_VALUE_PRESETS.DEFAULT},
                {sentence: '(robin --> flyer)', truth: TEST_CONSTANTS.TRUTH_VALUE_PRESETS.MEDIUM}
            ],
            expected: {conclusion: '(bird --> flyer)', truth: [0.8, 0.68]}
        }
    ],

    CONFIGURATION_VALIDATION: [
        {
            name: 'valid configuration',
            config: {reasoner: {strategy: 'BruteForce'}, memory: {capacity: 1000}},
            expected: {valid: true}
        },
        {
            name: 'invalid strategy config',
            config: {reasoner: {strategy: 'invalid_strategy'}},
            expected: {valid: false, error: /invalid.*strategy/i}
        }
    ]
};