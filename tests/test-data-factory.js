/**
 * Unified Data Factory
 * High-performance test data creation with caching and deduplication
 */

import Term from '../core/core/Term.js';
import Task from '../core/core/Task.js';

// Performance-optimized data factory registry
const DataFactory = {
    // Factory cache for performance
    cache: new Map(),

    // Factory templates
    templates: new Map(),

    // Performance metrics
    metrics: {creations: 0, cacheHits: 0},

    // Register factory template
    register: (name, template) => DataFactory.templates.set(name, template),

    // Create with caching
    create: (templateName, ...args) => {
        DataFactory.metrics.creations++;
        const cacheKey = `${templateName}:${JSON.stringify(args)}`;

        if (DataFactory.cache.has(cacheKey)) {
            DataFactory.metrics.cacheHits++;
            return DataFactory.cache.get(cacheKey);
        }

        const template = DataFactory.templates.get(templateName);
        if (!template) throw new Error(`Unknown data template: ${templateName}`);

        const data = template(...args);
        DataFactory.cache.set(cacheKey, data);
        return data;
    },

    // Reset cache and metrics
    reset: () => {
        DataFactory.cache.clear();
        DataFactory.metrics = {creations: 0, cacheHits: 0};
    },

    // Get performance stats
    getStats: () => ({
        ...DataFactory.metrics,
        hitRate: DataFactory.metrics.creations > 0 ?
            (DataFactory.metrics.cacheHits / DataFactory.metrics.creations) * 100 : 0
    })
};

// Register core data templates
DataFactory.register('taskDef', (sentence, punctuation = '.', truth = [1.0, 0.9], options = {}) => ({
    sentence, punctuation, truth, ...options
}));

DataFactory.register('termDef', (key, embedding = [0.1, 0.2, 0.3], complexity = 1, options = {}) => ({
    key, embedding, complexity, ...options
}));

DataFactory.register('systemConfig', (overrides = {}) => ({
    reasoner: {strategy: 'BruteForce'},
    ...overrides
}));

DataFactory.register('task', (termOrKey, punctuation = '.', truthValue = null, stamp = null, options = {}) => {
    const term = typeof termOrKey === 'string' ? new Term(termOrKey) : termOrKey;
    const defaultTruthValue = truthValue || {frequency: 1.0, confidence: 0.9};
    return new Task(term, punctuation, defaultTruthValue, stamp, options);
});

DataFactory.register('term', (key, embedding = [0.1, 0.2, 0.3], complexity = 1, options = {}) =>
    new Term(key, embedding, complexity, options));

DataFactory.register('complexTerm', (subjectKey, predicateKey, relation = '-->') => ({
    type: 'Inheritance',
    subject: DataFactory.create('termDef', subjectKey),
    predicate: DataFactory.create('termDef', predicateKey),
    relation
}));

// Unified data creation API
export const createData = (type, ...args) => DataFactory.create(type, ...args);

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
    BASIC_TASK: () => createTaskDef('(cat --> animal)', '.', [0.8, 0.9]),

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
        temporalRelation: '&/ A B'
    })
};

// Template-based data creation
export const createTestDataTemplate = (templateName) => {
    const templates = {
        basic: () => ({
            term: createTerm('cat'),
            task: createTask('cat', '.', {frequency: 1.0, confidence: 0.9})
        }),
        inheritance: () => ({
            subjectTerm: createTerm('cat'),
            predicateTerm: createTerm('animal'),
            inheritanceTerm: createTerm('(cat --> animal)'),
            subjectTask: createTask('cat', '.', {frequency: 0.8, confidence: 0.9}),
            predicateTask: createTask('animal', '.', {frequency: 1.0, confidence: 0.9}),
            inheritanceTask: createTask('(cat --> animal)', '.', {frequency: 0.8, confidence: 0.7})
        }),
        deduction: () => ({
            premiseA: createTask('bird', '.', {frequency: 0.9, confidence: 0.8}),
            premiseB: createTask('animal', '.', {frequency: 1.0, confidence: 0.9}),
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

// Performance monitoring
export const getDataFactoryStats = () => DataFactory.getStats();
export const resetDataFactoryCache = () => DataFactory.reset();