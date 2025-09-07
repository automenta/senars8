const moo = require('moo');

const lexer = moo.compile({
    // Whitespace
    whitespace: {match: /\s+/, lineBreaks: true},

    // Punctuation
    lparen: '(',
    rparen: ')',
    comma: ',',
    arrow: '-->',
    implies: '==>',
    instance: '{--',
    property: '--}',
    sequentialConjunction: '&&',  // Must be before conjunction
    parallelConjunction: '&|',    // Must be before conjunction
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
    concurrent: '=<>',

    // Temporal operators
    always: 'always',
    eventually: 'eventually',
    until: 'until',
    since: 'since',
    next: 'next',
    previous: 'previous',

    setExtension: '{',
    setIntension: '[',
    rbrace: '}',
    rbracket: ']',
    colon: ':',
    question: '?',
    goal: '!',
    belief: '.',

    // Literals
    identifier: /[a-zA-Z_][a-zA-Z0-9_]*/,

    // Variables
    independentVar: /\w+/,
    dependentVar: /#\w+/,
    queryVar: /\?\w+/,

    // Numbers
    number: /\d+(?:\.\d+)?/
});

module.exports = lexer;