/**
 * Parses a Narsese-style term key into a structured object.
 * This is a simplified parser for the specific syntax defined in the README.
 * @param {string} termKey The term key string to parse.
 * @returns {object | null} A structured representation of the term, or null if parsing fails.
 */
function parseTerm(termKey) {
    if (typeof termKey !== 'string' || termKey.length === 0) {
        return null;
    }

    // Regular Expressions for different term types
    const inheritanceRegex = /^\((.+?)\s*-->\s*(.+?)\)$/;
    const implicationRegex = /^\((.+?)\s*==>\s*(.+?)\)$/;
    const instanceRegex = /^\((.+?)\s*{\--\s*(.+?)\)$/;
    const propertyRegex = /^\((.+?)\s*--\}\s*(.+?)\)$/;
    const negationRegex = /^\(--,\s*(.+?)\)$/;
    const conjunctionRegex = /^\(&,\s*(.+?)\)$/;

    let match;

    if ((match = termKey.match(inheritanceRegex))) {
        return {type: 'Inheritance', subject: match[1], predicate: match[2]};
    }
    if ((match = termKey.match(implicationRegex))) {
        return {type: 'Implication', subject: match[1], predicate: match[2]};
    }
    if ((match = termKey.match(instanceRegex))) {
        return {type: 'Instance', instance: match[1], class: match[2]};
    }
    if ((match = termKey.match(propertyRegex))) {
        return {type: 'Property', instance: match[1], property: match[2]};
    }
    if ((match = termKey.match(negationRegex))) {
        return {type: 'Negation', term: match[1]};
    }
    if ((match = termKey.match(conjunctionRegex))) {
        const terms = match[1].split(/\s*,\s*/);
        return {type: 'Conjunction', terms: terms};
    }

    // If no specific structure is matched, treat it as an atomic term.
    if (!/^\(.*\)$/.test(termKey)) {
        return {type: 'Atomic', key: termKey};
    }

    return null; // Return null if it looks like a compound term but doesn't match any pattern
}

module.exports = {parseTerm};
