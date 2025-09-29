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
    operator: '^',
    implies: '==>',
    instance: '{--',
    property: '--}',
    sequentialConjunction: '&&',
    parallelConjunction: '&|',
    negation: '--',
    conjunction: '&',
    disjunction: '||',
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
    dependentVar: /#\w*/,
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
