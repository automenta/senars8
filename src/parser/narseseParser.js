const lexer = require('./lexer');
const {handleErrorWithDefault} = require('../utils/error-handler');

class NarseseParser {
    termParsers = {
        lparen: () => {
            this.consume('lparen');
            const operatorToken = this.current.type;
            this.consume(operatorToken);
            this.consume('comma');
            const terms = this.parseTermList();
            this.consume('rparen');
            return {type: operatorToken, terms};
        },
        setExtension: () => {
            this.consume('setExtension');
            const terms = this.parseTermList();
            this.consume('rbrace');
            return {type: 'ExtensionalSet', terms};
        },
        setIntension: () => {
            this.consume('setIntension');
            const terms = this.parseTermList();
            this.consume('rbracket');
            return {type: 'IntensionalSet', terms};
        },
        identifier: () => ({type: 'Atomic', key: this.consume('identifier')}),
        independentVar: () => ({type: 'IndependentVariable', name: this.consume('independentVar')}),
        dependentVar: () => ({type: 'DependentVariable', name: this.consume('dependentVar')}),
        queryVar: () => ({type: 'QueryVariable', name: this.consume('queryVar')}),
    };

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
            this.consume('lparen');

            if (this.match('negation')) {
                this.consume('negation');
                this.consume('comma');
                const term = this.parseTerm();
                this.consume('rparen');
                return {type: 'Negation', term};
            } else if (this.match('conjunction')) {
                this.consume('conjunction');
                this.consume('comma');
                const terms = this.parseTermList();
                this.consume('rparen');
                return {type: 'Conjunction', terms};
            } else if (this.match('sequentialConjunction')) {
                this.consume('sequentialConjunction');
                this.consume('comma');
                const terms = this.parseTermList();
                this.consume('rparen');
                return {type: 'SequentialConjunction', terms};
            } else if (this.match('parallelConjunction')) {
                this.consume('parallelConjunction');
                this.consume('comma');
                const terms = this.parseTermList();
                this.consume('rparen');
                return {type: 'ParallelConjunction', terms};
            } else if (this.match('product')) {
                this.consume('product');
                this.consume('comma');
                const terms = this.parseTermList();
                this.consume('rparen');
                return {type: 'Product', terms};
            } else if (this.match('disjunction')) {
                this.consume('disjunction');
                this.consume('comma');
                const terms = this.parseTermList();
                this.consume('rparen');
                return {type: 'Disjunction', terms};
            } else if (this.match('extensionalDifference')) {
                this.consume('extensionalDifference');
                this.consume('comma');
                const terms = this.parseTermList();
                this.consume('rparen');
                return {type: 'ExtensionalDifference', terms};
            } else if (this.match('intensionalDifference')) {
                this.consume('intensionalDifference');
                this.consume('comma');
                const terms = this.parseTermList();
                this.consume('rparen');
                return {type: 'IntensionalDifference', terms};
            } else if (this.match('always')) {
                this.consume('always');
                this.consume('comma');
                const term = this.parseTerm();
                this.consume('rparen');
                return {type: 'Always', term};
            } else if (this.match('eventually')) {
                this.consume('eventually');
                this.consume('comma');
                const term = this.parseTerm();
                this.consume('rparen');
                return {type: 'Eventually', term};
            } else if (this.match('next')) {
                this.consume('next');
                this.consume('comma');
                const term = this.parseTerm();
                this.consume('rparen');
                return {type: 'Next', term};
            } else if (this.match('previous')) {
                this.consume('previous');
                this.consume('comma');
                const term = this.parseTerm();
                this.consume('rparen');
                return {type: 'Previous', term};
            } else {
                const firstTerm = this.parseTerm();

                if (this.match('arrow')) {
                    this.consume('arrow');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return {type: 'Inheritance', subject: firstTerm, predicate};
                } else if (this.match('implies')) {
                    this.consume('implies');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return {type: 'Implication', subject: firstTerm, predicate};
                } else if (this.match('instance')) {
                    this.consume('instance');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return {type: 'Instance', subject: firstTerm, predicate};
                } else if (this.match('property')) {
                    this.consume('property');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return {type: 'Property', subject: firstTerm, predicate};
                } else if (this.match('equivalence')) {
                    this.consume('equivalence');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return {type: 'Equivalence', subject: firstTerm, predicate};
                } else if (this.match('similarity')) {
                    this.consume('similarity');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return {type: 'Similarity', subject: firstTerm, predicate};
                } else if (this.match('retrospection')) {
                    this.consume('retrospection');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return {type: 'RetrospectiveImplication', subject: firstTerm, predicate};
                } else if (this.match('prediction')) {
                    this.consume('prediction');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return {type: 'PredictiveImplication', subject: firstTerm, predicate};
                } else if (this.match('concurrent')) {
                    this.consume('concurrent');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return {type: 'ConcurrentImplication', subject: firstTerm, predicate};
                } else if (this.match('until')) {
                    this.consume('until');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return {type: 'Until', subject: firstTerm, predicate};
                } else if (this.match('since')) {
                    this.consume('since');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return {type: 'Since', subject: firstTerm, predicate};
                } else {
                    this.consume('rparen');
                    return firstTerm;
                }
            }
        } else if (this.match('setExtension')) {
            this.consume('setExtension');
            const terms = this.parseTermList();
            this.consume('rbrace');
            return {type: 'ExtensionalSet', terms};
        } else if (this.match('setIntension')) {
            this.consume('setIntension');
            const terms = this.parseTermList();
            this.consume('rbracket');
            return {type: 'IntensionalSet', terms};
        } else if (this.match('identifier')) {
            const identifier = this.consume('identifier');
            return {type: 'Atomic', key: identifier};
        } else if (this.match('independentVar')) {
            const variable = this.consume('independentVar');
            return {type: 'IndependentVariable', name: variable};
        } else if (this.match('dependentVar')) {
            const variable = this.consume('dependentVar');
            return {type: 'DependentVariable', name: variable};
        } else if (this.match('queryVar')) {
            const variable = this.consume('queryVar');
            return {type: 'QueryVariable', name: variable};
        } else {
            throw new Error(`Unexpected token '${this.current ? this.current.type : 'EOF'}' when parsing term`);
        }
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
            // Attach the original string key to the parsed object.
            if (typeof parsed === 'object' && !parsed.key) {
                parsed.key = input;
            }
        }
        return parsed;
    } catch (error) {
        return handleErrorWithDefault(error, 'Narsese parsing error', null);
    }
}

module.exports = {parseTerm};