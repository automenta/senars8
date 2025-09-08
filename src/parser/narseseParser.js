const lexer = require('./lexer');
const {handleErrorWithDefault} = require('../utils/error-handler');

// Import parser modules
const unaryOperators = require('./modules/unary-operators');
const temporalOperators = require('./modules/temporal-operators');
const binaryOperators = require('./modules/binary-operators');
const compoundTerms = require('./modules/compound-terms');
const setTerms = require('./modules/set-terms');
const atomicTerms = require('./modules/atomic-terms');

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

    // --- Term parsing methods ---

    parseTerm() {
        if (this.match('lparen')) {
            return this.parseCompoundTerm();
        } else if (this.match('setExtension')) {
            return setTerms.parseExtensionalSet(this);
        } else if (this.match('setIntension')) {
            return setTerms.parseIntensionalSet(this);
        } else if (this.match('identifier')) {
            return atomicTerms.parseAtomicTerm(this);
        } else if (this.match('independentVar')) {
            return atomicTerms.parseIndependentVariable(this);
        } else if (this.match('dependentVar')) {
            return atomicTerms.parseDependentVariable(this);
        } else if (this.match('queryVar')) {
            return atomicTerms.parseQueryVariable(this);
        } else {
            throw new Error(`Unexpected token '${this.current ? this.current.type : 'EOF'}' when parsing term`);
        }
    }

    parseCompoundTerm() {
        this.consume('lparen');

        // Handle unary operators
        if (unaryOperators.matchUnaryOperator(this)) {
            return unaryOperators.parseUnaryOperator(this);
        }

        // Handle temporal operators
        if (temporalOperators.matchTemporalOperator(this)) {
            return temporalOperators.parseTemporalOperator(this);
        }

        // Handle binary operators
        if (binaryOperators.matchBinaryOperator(this)) {
            return binaryOperators.parseBinaryOperator(this);
        }

        // Handle special compound terms
        const firstTerm = this.parseTerm();
        
        if (this.match('arrow')) {
            return compoundTerms.parseInheritance(this, firstTerm);
        } else if (this.match('implies')) {
            return compoundTerms.parseImplication(this, firstTerm);
        } else if (this.match('instance')) {
            return compoundTerms.parseInstance(this, firstTerm);
        } else if (this.match('property')) {
            return compoundTerms.parseProperty(this, firstTerm);
        } else if (this.match('equivalence')) {
            return compoundTerms.parseEquivalence(this, firstTerm);
        } else if (this.match('similarity')) {
            return compoundTerms.parseSimilarity(this, firstTerm);
        } else if (this.match('retrospection')) {
            return compoundTerms.parseRetrospectiveImplication(this, firstTerm);
        } else if (this.match('prediction')) {
            return compoundTerms.parsePredictiveImplication(this, firstTerm);
        } else if (this.match('concurrent')) {
            return compoundTerms.parseConcurrentImplication(this, firstTerm);
        } else if (this.match('until')) {
            return compoundTerms.parseUntil(this, firstTerm);
        } else if (this.match('since')) {
            return compoundTerms.parseSince(this, firstTerm);
        } else {
            this.consume('rparen');
            return firstTerm;
        }
    }

    // --- Term lists ---

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