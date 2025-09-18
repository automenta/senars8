import moo from 'moo';

const WHITESPACE = {
    whitespace: {
        match: /\s+/,
        lineBreaks: true
    },
};

const PUNCTUATION = {
    lparen: /[<(]/,
    rparen: /[>)]/,
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
    concurrent: '<>'
};

const TEMPORAL = {
    always: 'always',
    eventually: 'eventually',
    until: 'until',
    since: 'since',
    next: 'next',
    previous: 'previous'
};

const STATEMENT_PUNCTUATION = {
    colon: ':',
    question: '?',
    goal: '!',
    belief: '.'
};

const LITERALS = {
    string: /"[^"]*"/,
    dependentVar: /#\w+/,
    queryVar: /\?\w+/,
    independentVar: /\$\w+/,
    identifier: /[a-zA-Z_][a-zA-Z0-9_]*/,
    number: /\d+(?:\.\d+)?/,
};

const lexer = moo.compile({
    ...WHITESPACE,
    ...PUNCTUATION,
    ...TEMPORAL,
    ...STATEMENT_PUNCTUATION,
    ...LITERALS,
});

export default lexer;
