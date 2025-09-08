/**
 * Set term parsing functions
 */

/**
 * Parse an extensional set
 * @param {object} parser - The parser instance
 * @returns {object} The parsed extensional set
 */
function parseExtensionalSet(parser) {
    parser.consume('setExtension');
    const terms = parser.parseTermList();
    parser.consume('rbrace');
    return {type: 'ExtensionalSet', terms};
}

/**
 * Parse an intensional set
 * @param {object} parser - The parser instance
 * @returns {object} The parsed intensional set
 */
function parseIntensionalSet(parser) {
    parser.consume('setIntension');
    const terms = parser.parseTermList();
    parser.consume('rbracket');
    return {type: 'IntensionalSet', terms};
}

module.exports = {
    parseExtensionalSet,
    parseIntensionalSet
};