import moo from 'moo';

const WHITESPACE = {
    whitespace: {match: /\s+/, lineBreaks: true}
};

const PARENS = {
    lparen: /[<(]/,
    rparen: /[>)]/,
};

const PUNCTUATION = {
    ...PARENS,
    lbrace: '{',
    rbrace: '}',
    lbracket: '[',
    rbracket: ']',
    comma: ',',
    arrow: '-->',
    implies: '==>',
    instance: '{--',
    property: '--}',
    sequentialConjunction: '&&',
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

const TEMPORAL = {
    always: 'always',
    eventually: 'eventually',
    until: 'until',
    since: 'since',
    next: 'next',
    previous: 'previous'
};

const SETS = {
    setExtension: PUNCTUATION.lbrace,
    setIntension: PUNCTUATION.lbracket,
    rbrace: PUNCTUATION.rbrace,
    rbracket: PUNCTUATION.rbracket
};

const STATEMENT_PUNCTUATION = {
    colon: ':',
    question: '?',
    goal: '!',
    belief: '.'
};

const LITERALS = {
    string: /"[^"]*"/,
    // Order matters: more specific identifiers first
    dependentVar: /#\w+/,
    queryVar: /\?\w+/,
    independentVar: /\$\w+/, // Made more specific with a $ prefix
    identifier: /[a-zA-Z_][a-zA-Z0-9_]*/,
    number: /\d+(?:\.\d+)?/
};

// The order of token rules is important. Keywords should come before general identifiers.
const lexer = moo.compile({
    ...WHITESPACE,
    ...PUNCTUATION,
    ...TEMPORAL,
    ...SETS,
    ...STATEMENT_PUNCTUATION,
    ...LITERALS,
});

export default lexer;
