import moo from 'moo';

const WHITESPACE = {
    whitespace: {
        match: /\s+/,
        lineBreaks: true
    },
};

const PUNCTUATION = {
    // Multi-character operators first to avoid conflicts with single chars
    equivalence: '<=>',
    similarity: '<->',
    arrow: '-->',
    implies: '==>',
    instance: '{--',
    property: '--}',
    sequentialConjunction: '&&',
    sequentialConjunctionAlt: '&/',
    parallelConjunction: '&|',
    negation: '--',
    retrospection: '=/>',
    prediction: '=\\\\>',
    concurrent: '<>',

    // Single character operators after
    lparen: /[<(]/,
    rparen: /[>)]/,
    lbrace: '{',
    rbrace: '}',
    lbracket: '[',
    rbracket: ']',
    comma: ',',
    conjunction: '&',
    disjunction: '||',
    intensionalDifference: '\\\\',
    product: '*'
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
    string: /\"[^\"]*\"/,
    dependentVar: /#\w*/,
    queryVar: /\?\w+/,
    independentVar: /\$\w+/,
    number: /\d+(?:\.\d+)?/,
    identifier: /[a-zA-Z_][a-zA-Z0-9_-]*/,
};

const lexer = moo.compile({
    ...WHITESPACE,
    ...PUNCTUATION,
    ...STATEMENT_PUNCTUATION,
    ...LITERALS,
    ...TEMPORAL,
});

/**
 * Tokenize a text string using the Narsese lexer
 * @param {string} text - Text to tokenize
 * @returns {Array} Array of tokens
 */
const tokenize = (text) => {
    if (!text) return [];

    const l = lexer.clone().reset(text);
    const tokens = [];
    for (let tok = l.next(); tok; tok = l.next()) {
        if (tok.type !== 'whitespace') {
            tokens.push(tok.value);
        }
    }
    return tokens;
};

export default lexer;
export {tokenize};