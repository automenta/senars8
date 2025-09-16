import lexer from './lexer.js';

const UNARY_OPERATORS = {
    negation: 'Negation',
    always: 'Always',
    eventually: 'Eventually',
    next: 'Next',
    previous: 'Previous'
};

const BINARY_OPERATORS = {
    conjunction: 'Conjunction',
    sequentialConjunction: 'SequentialConjunction',
    parallelConjunction: 'ParallelConjunction',
    disjunction: 'Disjunction',
    extensionalDifference: 'ExtensionalDifference',
    intensionalDifference: 'IntensionalDifference',
    product: 'Product'
};

const BINARY_RELATIONS = {
    arrow: 'Inheritance',
    implies: 'Implication',
    instance: 'Instance',
    property: 'Property',
    equivalence: 'Equivalence',
    similarity: 'Similarity',
    retrospection: 'RetrospectiveImplication',
    prediction: 'PredictiveImplication',
    concurrent: 'ConcurrentImplication',
    until: 'Until',
    since: 'Since',
};

const VARIABLE_TYPES = {
    independentVar: 'IndependentVariable',
    dependentVar: 'DependentVariable',
    queryVar: 'QueryVariable',
};

const PUNCTUATION_TYPES = ['belief', 'goal', 'question'];

class NarseseParser {
    constructor(input) {
        this.lexer = lexer.clone();
        this.lexer.reset(input);
        this.current = null;
        this.next();
    }

    next() {
        do {
            this.current = this.lexer.next();
        } while (this.current && this.current.type === 'whitespace');
        return this.current;
    }

    match(type) {
        return this.current && this.current.type === type;
    }

    consume(type) {
        if (this.match(type)) {
            const {
                value
            } = this.current;
            this.next();
            return value;
        }
        throw new Error(`Expected token type '${type}', but found '${this.current ? this.current.type : 'EOF'}'`);
    }

    parseMain() {
        const result = this.parseStatement();
        if (this.current) {
            throw new Error(`Unexpected token '${this.current.type}' at end of input`);
        }
        return result;
    }

    parseStatement() {
        const term = this.parseTerm();
        const punctuation = PUNCTUATION_TYPES.includes(this.current?.type) ? this.consume(this.current.type) : null;
        const truthValue = this.match('lparen') ? this.parseTruthValue() : null;

        return punctuation || truthValue ? {
            type: 'Statement',
            term,
            punctuation,
            truthValue
        } : term;
    }

    parseTruthValue() {
        this.consume('lparen');
        const frequency = this.parseNumber();
        this.consume('comma');
        const confidence = this.parseNumber();
        this.consume('rparen');
        return {
            frequency,
            confidence
        };
    }

    parseTerm() {
        const tokenType = this.current?.type;
        const termParser = {
            'lparen': () => this.parseCompoundTerm(),
            'lbrace': () => this.parseSet('ExtensionalSet', 'lbrace', 'rbrace'),
            'lbracket': () => this.parseIntensionalSet('IntensionalSet', 'lbracket', 'rbracket'),
            'identifier': () => this.parseAtomicTerm(),
            'string': () => this.parseAtomicTerm(),
            'number': () => this.parseNumber(),
            ...Object.fromEntries(Object.keys(VARIABLE_TYPES).map(type => [type, () => this.parseVariable(type)])),
        } [tokenType];

        if (termParser) {
            return termParser();
        }
        throw new Error(`Unexpected token '${tokenType || 'EOF'}' when parsing term`);
    }

    parseNumber() {
        const value = this.consume('number');
        return {
            type: 'Number',
            value: parseFloat(value)
        };
    }

    parseCompoundTerm() {
        this.consume('lparen');
        const operatorType = this.current?.type;

        if (UNARY_OPERATORS[operatorType]) {
            return this.parseUnaryOperator(operatorType);
        }
        if (BINARY_OPERATORS[operatorType]) {
            return this.parseBinaryOperator(operatorType);
        }

        const firstTerm = this.parseTerm();
        const relationType = BINARY_RELATIONS[this.current?.type];

        if (relationType) {
            return this.parseBinaryRelation(firstTerm, this.current.type, relationType);
        }

        this.consume('rparen');
        return firstTerm;
    }

    parseUnaryOperator(operator) {
        this.consume(operator);
        this.consume('comma');
        const term = this.parseTerm();
        this.consume('rparen');
        return {
            type: UNARY_OPERATORS[operator],
            term
        };
    }

    parseBinaryOperator(operator) {
        this.consume(operator);
        this.consume('comma');
        const terms = this.parseTermList();
        this.consume('rparen');
        return {
            type: BINARY_OPERATORS[operator],
            terms
        };
    }

    parseBinaryRelation(subject, tokenType, relationType) {
        this.consume(tokenType);
        const predicate = this.parseTerm();
        this.consume('rparen');
        return {
            type: relationType,
            subject,
            predicate
        };
    }

    parseSet(type, open, close) {
        this.consume(open);
        const terms = this.parseTermList(close);
        this.consume(close);
        return {
            type,
            terms
        };
    }

    parseExtensionalSet() {
        return this.parseSet('ExtensionalSet', 'lbrace', 'rbrace');
    }

    parseIntensionalSet() {
        return this.parseSet('IntensionalSet', 'lbracket', 'rbracket');
    }

    parseAtomicTerm() {
        const token = this.current;
        this.next();
        return {
            type: 'Atomic',
            key: token.value
        };
    }

    parseVariable(tokenType) {
        const name = this.consume(tokenType);
        return {
            type: VARIABLE_TYPES[tokenType],
            name
        };
    }

    parseTermList(closingToken = 'rparen') {
        const terms = [];
        if (!this.match(closingToken)) {
            terms.push(this.parseTerm());
            while (this.match('comma')) {
                this.consume('comma');
                terms.push(this.parseTerm());
            }
        }
        return terms;
    }
}

function parseTerm(input) {
    if (typeof input !== 'string' || !input.length) {
        return null;
    }

    const parser = new NarseseParser(input);
    const parsed = parser.parseMain();
    if (parsed && typeof parsed === 'object' && !parsed.key) {
        parsed.key = input;
    }
    return parsed;
}

export {parseTerm};
