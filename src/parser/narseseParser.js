const lexer = require('./lexer');

class NarseseParser {
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
            const value = this.current.value;
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
                term: term,
                punctuation: punctuation,
                truthValue: truthValue
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

    parseNumber() {
        if (this.match('number')) {
            return this.consume('number');
        }
        throw new Error(`Expected a number, but found '${this.current ? this.current.type : 'EOF'}'`);
    }

    parseTerm() {
        if (this.match('lparen')) {
            return this.parseCompoundTerm();
        } else if (this.match('setExtension')) {
            return this.parseExtensionalSet();
        } else if (this.match('setIntension')) {
            return this.parseIntensionalSet();
        } else if (this.match('identifier')) {
            return this.parseAtomicTerm();
        } else if (this.match('independentVar')) {
            return this.parseIndependentVariable();
        } else if (this.match('dependentVar')) {
            return this.parseDependentVariable();
        } else if (this.match('queryVar')) {
            return this.parseQueryVariable();
        } else {
            throw new Error(`Unexpected token '${this.current ? this.current.type : 'EOF'}' when parsing term`);
        }
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
        
        if (this.match('arrow')) {
            return this.parseInheritance(firstTerm);
        } else if (this.match('implies')) {
            return this.parseImplication(firstTerm);
        } else if (this.match('instance')) {
            return this.parseInstance(firstTerm);
        } else if (this.match('property')) {
            return this.parseProperty(firstTerm);
        } else if (this.match('equivalence')) {
            return this.parseEquivalence(firstTerm);
        } else if (this.match('similarity')) {
            return this.parseSimilarity(firstTerm);
        } else if (this.match('retrospection')) {
            return this.parseRetrospectiveImplication(firstTerm);
        } else if (this.match('prediction')) {
            return this.parsePredictiveImplication(firstTerm);
        } else if (this.match('concurrent')) {
            return this.parseConcurrentImplication(firstTerm);
        } else if (this.match('until')) {
            return this.parseUntil(firstTerm);
        } else if (this.match('since')) {
            return this.parseSince(firstTerm);
        } else {
            this.consume('rparen');
            return firstTerm;
        }
    }

    matchUnaryOperator() {
        return ['negation'].includes(this.current.type);
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
        const mapping = {
            'negation': 'Negation'
        };
        return mapping[operator] || operator;
    }

    matchTemporalOperator() {
        return ['always', 'eventually', 'next', 'previous'].includes(this.current.type);
    }

    parseTemporalOperator() {
        const operatorToken = this.current;
        this.next(); // Consume the operator token
        this.consume('comma');
        const term = this.parseTerm();
        this.consume('rparen');
        return {type: this.getTemporalOperatorType(operatorToken.type), term};
    }

    getTemporalOperatorType(operator) {
        const mapping = {
            'always': 'Always',
            'eventually': 'Eventually',
            'next': 'Next',
            'previous': 'Previous'
        };
        return mapping[operator] || operator;
    }

    matchBinaryOperator() {
        return [
            'conjunction', 'sequentialConjunction', 'parallelConjunction',
            'disjunction', 'extensionalDifference', 'intensionalDifference',
            'product'
        ].includes(this.current.type);
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
        const mapping = {
            'conjunction': 'Conjunction',
            'sequentialConjunction': 'SequentialConjunction',
            'parallelConjunction': 'ParallelConjunction',
            'disjunction': 'Disjunction',
            'extensionalDifference': 'ExtensionalDifference',
            'intensionalDifference': 'IntensionalDifference',
            'product': 'Product'
        };
        return mapping[operator] || operator;
    }

    parseInheritance(subject) {
        this.consume('arrow');
        const predicate = this.parseTerm();
        this.consume('rparen');
        return {type: 'Inheritance', subject, predicate};
    }

    parseImplication(subject) {
        this.consume('implies');
        const predicate = this.parseTerm();
        this.consume('rparen');
        return {type: 'Implication', subject, predicate};
    }

    parseInstance(subject) {
        this.consume('instance');
        const predicate = this.parseTerm();
        this.consume('rparen');
        return {type: 'Instance', subject, predicate};
    }

    parseProperty(subject) {
        this.consume('property');
        const predicate = this.parseTerm();
        this.consume('rparen');
        return {type: 'Property', subject, predicate};
    }

    parseEquivalence(subject) {
        this.consume('equivalence');
        const predicate = this.parseTerm();
        this.consume('rparen');
        return {type: 'Equivalence', subject, predicate};
    }

    parseSimilarity(subject) {
        this.consume('similarity');
        const predicate = this.parseTerm();
        this.consume('rparen');
        return {type: 'Similarity', subject, predicate};
    }

    parseRetrospectiveImplication(subject) {
        this.consume('retrospection');
        const predicate = this.parseTerm();
        this.consume('rparen');
        return {type: 'RetrospectiveImplication', subject, predicate};
    }

    parsePredictiveImplication(subject) {
        this.consume('prediction');
        const predicate = this.parseTerm();
        this.consume('rparen');
        return {type: 'PredictiveImplication', subject, predicate};
    }

    parseConcurrentImplication(subject) {
        this.consume('concurrent');
        const predicate = this.parseTerm();
        this.consume('rparen');
        return {type: 'ConcurrentImplication', subject, predicate};
    }

    parseUntil(subject) {
        this.consume('until');
        const predicate = this.parseTerm();
        this.consume('rparen');
        return {type: 'Until', subject, predicate};
    }

    parseSince(subject) {
        this.consume('since');
        const predicate = this.parseTerm();
        this.consume('rparen');
        return {type: 'Since', subject, predicate};
    }

    parseExtensionalSet() {
        this.consume('setExtension');
        const terms = this.parseTermList();
        this.consume('rbrace');
        return {type: 'ExtensionalSet', terms};
    }

    parseIntensionalSet() {
        this.consume('setIntension');
        const terms = this.parseTermList();
        this.consume('rbracket');
        return {type: 'IntensionalSet', terms};
    }

    parseAtomicTerm() {
        const identifier = this.consume('identifier');
        return {type: 'Atomic', key: identifier};
    }

    parseIndependentVariable() {
        const variable = this.consume('independentVar');
        return {type: 'IndependentVariable', name: variable};
    }

    parseDependentVariable() {
        const variable = this.consume('dependentVar');
        return {type: 'DependentVariable', name: variable};
    }

    parseQueryVariable() {
        const variable = this.consume('queryVar');
        return {type: 'QueryVariable', name: variable};
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

module.exports = {parseTerm};