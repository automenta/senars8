const moo = require('moo');

// Define tokens in groups for better organization while maintaining correct order
const WHITESPACE = {
    whitespace: {match: /\s+/, lineBreaks: true}
};

// Punctuation tokens - order matters for correct parsing
const PUNCTUATION = {
    lparen: '(',
    rparen: ')',
    comma: ',',
    arrow: '-->',
    implies: '==>',
    instance: '{--',
    property: '--}',
    // Must be before conjunction for correct parsing
    sequentialConjunction: '&&',
    // Must be before conjunction for correct parsing
    parallelConjunction: '&|',
    negation: '--',
    conjunction: '&',
    disjunction: '||',
    extensionalDifference: '#',
    intensionalDifference: '\\',
    product: '*',
    equivalence: '<=>',
    similarity: '<->',
    retrospection: '=/>',
    prediction: '=\\>',
    concurrent: '=<>'
};

// Temporal operators
const TEMPORAL = {
    always: 'always',
    eventually: 'eventually',
    until: 'until',
    since: 'since',
    next: 'next',
    previous: 'previous'
};

// Set notation tokens
const SETS = {
    setExtension: '{',
    setIntension: '[',
    rbrace: '}',
    rbracket: ']'
};

// Statement punctuation
const STATEMENT_PUNCTUATION = {
    colon: ':',
    question: '?',
    goal: '!',
    belief: '.'
};

// Literals and variables
const LITERALS = {
    identifier: /[a-zA-Z_][a-zA-Z0-9_]*/,
    // Variables
    independentVar: /\w+/,
    dependentVar: /#\w+/,
    queryVar: /\?\w+/,
    // Numbers
    number: /\d+(?:\.\d+)?/
};

// Combine all tokens in the exact same order as the original
const lexer = moo.compile({
    ...WHITESPACE,
    ...PUNCTUATION,
    ...TEMPORAL,
    ...SETS,
    ...STATEMENT_PUNCTUATION,
    ...LITERALS
});

module.exports = lexer;