const lexer = require('./lexer');
const {handleErrorWithDefault, createParseError} = require('../utils/error-handler');

/**
 * Base parser class providing common parsing functionality
 */
class BaseParser {
    constructor(input) {
        this.lexer = lexer.clone();
        this.lexer.reset(input);
        this.current = null;
        this.next();
    }

    /**
     * Advance to the next token
     * @returns {object|null} The next token
     */
    next() {
        this.current = this.lexer.next();
        while (this.current && this.current.type === 'whitespace') {
            this.current = this.lexer.next();
        }
        return this.current;
    }

    /**
     * Check if the current token matches a type
     * @param {string} type - The token type to check
     * @returns {boolean} True if the current token matches
     */
    match(type) {
        return this.current && this.current.type === type;
    }

    /**
     * Consume a token of a specific type
     * @param {string} type - The token type to consume
     * @returns {string} The token value
     * @throws {ParseError} If the current token doesn't match the expected type
     */
    consume(type) {
        if (this.match(type)) {
            const value = this.current.value;
            this.next();
            return value;
        }
        const error = createParseError(`Expected token type '${type}', but found '${this.current ? this.current.type : 'EOF'}'`);
        throw error;
    }

    /**
     * Parse a list of terms
     * @returns {Array} Array of parsed terms
     */
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

module.exports = BaseParser;