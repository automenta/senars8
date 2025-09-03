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
    negation: '--,',
    conjunction: '&,',
    disjunction: '||,',
    extensionalDifference: '#,',
    intensionalDifference: '\\,',
    product: '*',
    sequentialConjunction: '&/',  // Temporal conjunction
    parallelConjunction: '&|',    // Parallel conjunction
    equivalence: '<=>',           // Equivalence
    similarity: '<->',            // Similarity
    retrospection: '=/>',         // Retrospective implication
    prediction: '=\\>',           // Predictive implication
    concurrent: '=<>',            // Concurrent implication
    setExtension: '{',            // Extensional set
    setIntension: '[',            // Intensional set
    rbrace: '}',                  // Right brace for extensional set
    rbracket: ']',                // Right bracket for intensional set
    colon: ':',                   // Colon for variable typing
    question: '?',                // Question punctuation
    goal: '!',                    // Goal punctuation
    belief: '.',                  // Belief punctuation

    // Literals
    identifier: /[a-zA-Z_][a-zA-Z0-9_]*/,

    // Variables
    independentVar: /\\\\w+/,
    dependentVar: /#\\w+/,
    queryVar: /\\?\\w+/,

    // Numbers
    number: /\\d+(?:\\.\\d+)?/
});

module.exports = lexer;