import lexer from './lexer.js';

class NarseseParser {
    static UNARY_OPERATOR_TYPES = new Map([
        ['negation', 'Negation']
    ]);

    static TEMPORAL_OPERATOR_TYPES = new Map([
        ['always', 'Always'],
        ['eventually', 'Eventually'],
        ['next', 'Next'],
        ['previous', 'Previous']
    ]);

    static BINARY_OPERATOR_TYPES = new Map([
        ['conjunction', 'Conjunction'],
        ['sequentialConjunction', 'SequentialConjunction'],
        ['parallelConjunction', 'ParallelConjunction'],
        ['disjunction', 'Disjunction'],
        ['extensionalDifference', 'ExtensionalDifference'],
        ['intensionalDifference', 'IntensionalDifference'],
        ['product', 'Product']
    ]);

    static UNARY_OPERATORS = new Set(NarseseParser.UNARY_OPERATOR_TYPES.keys());
    static TEMPORAL_OPERATORS = new Set(NarseseParser.TEMPORAL_OPERATOR_TYPES.keys());
    static BINARY_OPERATORS = new Set(NarseseParser.BINARY_OPERATOR_TYPES.keys());

    static BINARY_RELATION_TYPES = new Map([
        ['arrow', 'Inheritance'],
        ['implies', 'Implication'],
        ['instance', 'Instance'],
        ['property', 'Property'],
        ['equivalence', 'Equivalence'],
        ['similarity', 'Similarity'],
        ['retrospection', 'RetrospectiveImplication'],
        ['prediction', 'PredictiveImplication'],
        ['concurrent', 'ConcurrentImplication'],
        ['until', 'Until'],
        ['since', 'Since'],
    ]);

    constructor(input) {
        this.lexer = lexer.clone();
        this.lexer.reset(input);
        this.current = null;
        this.next();
    }

    next() {
        this.current = this.lexer.next();
        while (this.current && this.current.type === 'whitespace') {
            this.current = this.lexer.next();
        }
        return this.current;
    }

    match(type) {
        return this.current && this.current.type === type;
    }

    consume(type) {
        if (this.match(type)) {
            const {value} = this.current;
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

        let punctuation = null;
        if (this.match('belief')) {
            punctuation = this.consume('belief');
        } else if (this.match('goal')) {
            punctuation = this.consume('goal');
        } else if (this.match('question')) {
            punctuation = this.consume('question');
        }

        let truthValue = null;
        if (this.match('lparen')) {
            truthValue = this.parseTruthValue();
        }

        if (punctuation || truthValue) {
            return {
                type: 'Statement',
                term,
                punctuation,
                truthValue
            };
        }

        return term;
    }

    parseTruthValue() {
        this.consume('lparen');
        const frequency = this.parseNumber();
        this.consume('comma');
        const confidence = this.parseNumber();
        this.consume('rparen');
        return {frequency, confidence};
    }

    parseTerm() {
        if (this.match('lparen')) {
            return this.parseCompoundTerm();
        } else if (this.match('lbrace')) { // Use lbrace for extensional sets
            return this.parseExtensionalSet();
        } else if (this.match('lbracket')) { // Use lbracket for intensional sets
            return this.parseIntensionalSet();
        } else if (this.match('identifier') || this.match('string')) {
            return this.parseAtomicTerm();
        } else if (this.match('independentVar')) {
            return this.parseIndependentVariable();
        } else if (this.match('dependentVar')) {
            return this.parseDependentVariable();
        } else if (this.match('queryVar')) {
            return this.parseQueryVariable();
        } else if (this.match('number')) {
            return this.parseNumber();
        }
        throw new Error(`Unexpected token '${this.current ? this.current.type : 'EOF'}' when parsing term`);
    }

    parseNumber() {
        const value = this.consume('number');
        return {type: 'Number', value: parseFloat(value)};
    }

    parseCompoundTerm() {
        this.consume('lparen');

        if (this.matchUnaryOperator()) {
            return this.parseUnaryOperator();
        }

        if (this.matchTemporalOperator()) {
            return this.parseTemporalOperator();
        }

        if (this.matchBinaryOperator()) {
            return this.parseBinaryOperator();
        }

        const firstTerm = this.parseTerm();
        const relationType = NarseseParser.BINARY_RELATION_TYPES.get(this.current.type);

        if (relationType) {
            return this.parseBinaryRelation(firstTerm, this.current.type, relationType);
        }

        this.consume('rparen');
        return firstTerm;
    }

    matchUnaryOperator() {
        return NarseseParser.UNARY_OPERATORS.has(this.current.type);
    }

    parseUnaryOperator() {
        const operatorToken = this.current;
        this.next(); // Consume the operator token
        this.consume('comma');
        const term = this.parseTerm();
        this.consume('rparen');
        return {type: this.getUnaryOperatorType(operatorToken.type), term};
    }

    getUnaryOperatorType(operator) {
        return NarseseParser.UNARY_OPERATOR_TYPES.get(operator) || operator;
    }

    matchTemporalOperator() {
        return NarseseParser.TEMPORAL_OPERATORS.has(this.current.type);
    }

    parseTemporalOperator() {
        const operatorToken = this.current;
        this.next(); // Consume the operator token
        this.consume('comma');
        const term = this.parseTerm();
        this.consume('rparen');
        return {type: this.getTemporalOperatorType(operatorToken.type), term};
    }

    matchBinaryOperator() {
        return NarseseParser.BINARY_OPERATORS.has(this.current.type);
    }

    parseBinaryOperator() {
        const operatorToken = this.current;
        this.next(); // Consume the operator token
        this.consume('comma');
        const terms = this.parseTermList();
        this.consume('rparen');
        return {type: this.getBinaryOperatorType(operatorToken.type), terms};
    }

    getBinaryOperatorType(operator) {
        return NarseseParser.BINARY_OPERATOR_TYPES.get(operator) || operator;
    }

    parseBinaryRelation(subject, tokenType, relationType) {
        this.consume(tokenType);
        const predicate = this.parseTerm();
        this.consume('rparen');
        return {type: relationType, subject, predicate};
    }

    parseExtensionalSet() {
        this.consume('lbrace');
        const terms = this.parseTermList();
        this.consume('rbrace');
        return {type: 'ExtensionalSet', terms};
    }

    parseIntensionalSet() {
        this.consume('lbracket');
        const terms = this.parseTermList();
        this.consume('rbracket');
        return {type: 'IntensionalSet', terms};
    }

    parseAtomicTerm() {
        const token = this.current;
        this.next(); // consume token
        return {type: 'Atomic', key: token.value};
    }

    parseVariable(tokenType, variableType) {
        const variable = this.consume(tokenType);
        return {type: variableType, name: variable};
    }

    parseIndependentVariable() {
        return this.parseVariable('independentVar', 'IndependentVariable');
    }

    parseDependentVariable() {
        return this.parseVariable('dependentVar', 'DependentVariable');
    }

    parseQueryVariable() {
        return this.parseVariable('queryVar', 'QueryVariable');
    }

    parseTermList() {
        const terms = [];

        if (!this.match('rparen') && !this.match('rbrace') && !this.match('rbracket')) {
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
    if (typeof input !== 'string' || input.length === 0) {
        return null;
    }

    try {
        const parser = new NarseseParser(input);
        const parsed = parser.parseMain();
        if (parsed) {
            if (typeof parsed === 'object' && !parsed.key) {
                parsed.key = input;
            }
        }
        return parsed;
    } catch (error) {
        throw error;
    }
}

export {parseTerm};
