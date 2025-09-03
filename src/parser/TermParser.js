const {parse} = require('./NewParser');

/**
 * Parses a Narsese-style term key into a structured object.
 * This parser uses a formal grammar for better extensibility and error handling.
 * @param {string} termKey The term key string to parse.
 * @returns {object | null} A structured representation of the term, or null if parsing fails.
 */
function parseTerm(termKey) {
    if (typeof termKey !== 'string' || termKey.length === 0) {
        return null;
    }

    try {
        return parse(termKey);
    } catch (error) {
        console.error('Parsing error:', error);
        return null;
    }
}

module.exports = {parseTerm};