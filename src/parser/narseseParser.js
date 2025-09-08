const BaseParser = require('./BaseParser');
const {handleErrorWithDefault, createParseError} = require('../utils/error-handler');

// Import parser modules
const unaryOperators = require('./modules/unary-operators');
const temporalOperators = require('./modules/temporal-operators');
const binaryOperators = require('./modules/binary-operators');
const compoundTerms = require('./modules/compound-terms');
const setTerms = require('./modules/set-terms');
const atomicTerms = require('./modules/atomic-terms');

class NarseseParser extends BaseParser {
    constructor(input) {
        super(input);
    }

    /**
     * Parse the main input
     * @returns {object} The parsed result
     */
    parseMain() {
        try {
            const result = this.parseStatement();
            if (this.current) {
                throw createParseError(`Unexpected token '${this.current.type}' at end of input`);
            }
            return result;
        } catch (error) {
            return handleErrorWithDefault(error, 'Narsese parsing error', null);
        }
    }

    /**
     * Parse a statement
     * @returns {object} The parsed statement
     */
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

    /**
     * Parse a truth value
     * @returns {object} The parsed truth value
     */
    parseTruthValue() {
        this.consume('lparen');
        const frequency = this.parseNumber();
        this.consume('comma');
        const confidence = this.parseNumber();
        this.consume('rparen');
        return {frequency, confidence};
    }

    /**
     * Parse a number
     * @returns {number} The parsed number
     */
    parseNumber() {
        if (this.match('number')) {
            return this.consume('number');
        }
        throw createParseError(`Expected a number, but found '${this.current ? this.current.type : 'EOF'}'`);
    }

    /**
     * Parse a term
     * @returns {object} The parsed term
     */
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
            throw createParseError(`Unexpected token '${this.current ? this.current.type : 'EOF'}' when parsing term`);
        }
    }

    /**
     * Parse a compound term
     * @returns {object} The parsed compound term
     */
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
}

/**
 * Parse a term from a string input
 * @param {string} input - The input string to parse
 * @returns {object|null} The parsed term or null if parsing fails
 */
function parseTermString(input) {
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

module.exports = {parseTerm: parseTermString};

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