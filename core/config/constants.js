export const PUNCTUATION = {
    BELIEF: '.',
    GOAL: '!',
    QUESTION: '?',
};

export const OP = {
    ATOMIC: 'Atomic',
    INDEPENDENT_VARIABLE: 'IndependentVariable',
    DEPENDENT_VARIABLE: 'DependentVariable',
    QUERY_VARIABLE: 'QueryVariable',
    INHERITANCE: 'Inheritance',
    IMPLICATION: 'Implication',
    EQUIVALENCE: 'Equivalence',
    SIMILARITY: 'Similarity',
    INSTANCE: 'Instance',
    PROPERTY: 'Property',
    PREDICTIVE_IMPLICATION: 'PredictiveImplication',
    RETROSPECTIVE_IMPLICATION: 'RetrospectiveImplication',
    CONCURRENT_IMPLICATION: 'ConcurrentImplication',
    UNTIL: 'Until',
    SINCE: 'Since',
    NEGATION: 'Negation',
    ALWAYS: 'Always',
    EVENTUALLY: 'Eventually',
    NEXT: 'Next',
    PREVIOUS: 'Previous',
    CONJUNCTION: 'Conjunction',
    DISJUNCTION: 'Disjunction',
    SEQUENTIAL_CONJUNCTION: 'SequentialConjunction',
    PARALLEL_CONJUNCTION: 'ParallelConjunction',
    EXTENSIONAL_DIFFERENCE: 'ExtensionalDifference',
    INTENSIONAL_DIFFERENCE: 'IntensionalDifference',
    PRODUCT: 'Product',
    EXTENSIONAL_SET: 'ExtensionalSet',
    INTENSIONAL_SET: 'IntensionalSet',
    NUMBER: 'Number',
    STATEMENT: 'Statement',
    OPERATION: 'Operation',
};

export const REL = {
    INHERITANCE: '-->',
    IMPLICATION: '==>',
    EQUIVALENCE: '<=>',
    SIMILARITY: '<->',
    INSTANCE: '{--',
    PROPERTY: '--}',
    PREDICTIVE_IMPLICATION: '=\\>',
    RETROSPECTIVE_IMPLICATION: '=/>',
    CONCURRENT_IMPLICATION: '=<>',
    NEGATION: '--,',
    ALWAYS: 'always,',
    EVENTUALLY: 'eventually,',
    NEXT: 'next,',
    PREVIOUS: 'previous,',
    CONJUNCTION: '&,',
    DISJUNCTION: '||,',
    SEQUENTIAL_CONJUNCTION: '&&,',
    SEQUENTIAL_CONJUNCTION_ALT: '&/,',
    PARALLEL_CONJUNCTION: '&|,',
    EXTENSIONAL_DIFFERENCE: '#,',
    INTENSIONAL_DIFFERENCE: '\\\\,',
    PRODUCT: '*,',
    OPERATION: '^',
};

export const TOKEN = {
    LPAREN: 'lparen',
    RPAREN: 'rparen',
    LBRACE: 'lbrace',
    RBRACE: 'rbrace',
    LBRACKET: 'lbracket',
    RBRACKET: 'rbracket',
    COMMA: 'comma',
    ARROW: 'arrow',
    IMPLIES: 'implies',
    INSTANCE: 'instance',
    PROPERTY: 'property',
    EQUIVALENCE: 'equivalence',
    SIMILARITY: 'similarity',
    RETROSPECTION: 'retrospection',
    PREDICTION: 'prediction',
    CONCURRENT: 'concurrent',
    UNTIL: 'until',
    SINCE: 'since',
    BELIEF: 'belief',
    GOAL: 'goal',
    QUESTION: 'question',
    NEGATION: 'negation',
    ALWAYS: 'always',
    EVENTUALLY: 'eventually',
    NEXT: 'next',
    PREVIOUS: 'previous',
    CONJUNCTION: 'conjunction',
    SEQUENTIAL_CONJUNCTION: 'sequentialConjunction',
    SEQUENTIAL_CONJUNCTION_ALT: 'sequentialConjunctionAlt',
    PARALLEL_CONJUNCTION: 'parallelConjunction',
    DISJUNCTION: 'disjunction',
    EXTENSIONAL_DIFFERENCE: 'extensionalDifference',
    INTENSIONAL_DIFFERENCE: 'intensionalDifference',
    PRODUCT: 'product',
    OPERATION: 'operation',
    IDENTIFIER: 'identifier',
    STRING: 'string',
    INDEPENDENT_VAR: 'independentVar',
    DEPENDENT_VAR: 'dependentVar',
    QUERY_VAR: 'queryVar',
    NUMBER: 'number',
    WHITESPACE: 'whitespace',
};

// Additional constants for system-wide use
export const SYSTEM_CONSTANTS = {
    DEFAULT_TRUTH_VALUES: {
        HIGH: { frequency: 1.0, confidence: 0.9 },
        MEDIUM_HIGH: { frequency: 0.9, confidence: 0.85 },
        MEDIUM: { frequency: 0.8, confidence: 0.85 },
        MEDIUM_LOW: { frequency: 0.7, confidence: 0.8 },
        LOW: { frequency: 0.5, confidence: 0.7 },
        VERY_LOW: { frequency: 0.1, confidence: 0.2 }
    },
    
    DEFAULT_PRIORITIES: {
        DEFAULT: 0,
        LOW: 0.1,
        MEDIUM: 0.5,
        HIGH: 0.8,
        VERY_HIGH: 0.95
    },
    
    DEFAULT_EMBEDDING: [0.1, 0.2, 0.3],
    
    DEFAULT_COMPLEXITY: 1,
    
    TIME_THRESHOLDS: {
        DEFAULT_EXPIRATION_MS: 24 * 3600 * 1000, // 1 day in ms
        LONG_EXPIRATION_MS: 30 * 24 * 3600 * 1000, // 30 days in ms
        DEFAULT_IMPORTANCE_THRESHOLD: 0.5,
        HIGH_IMPORTANCE_THRESHOLD: 0.8,
        VERY_HIGH_IMPORTANCE_THRESHOLD: 0.95
    },
    
    BATCH_SIZES: {
        DEFAULT: 10,
        SMALL: 5,
        LARGE: 50
    },
    
    TIMEOUTS: {
        DEFAULT: 5000,
        LONG: 10000,
        VERY_LONG: 30000,
        EXTRA_LONG: 300000,
        MAX_LONG: 600000
    }
};

// Export all constants as a single object
export default {
    PUNCTUATION,
    OP,
    REL,
    TOKEN,
    SYSTEM_CONSTANTS
};
