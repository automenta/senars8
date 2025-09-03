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
    const instanceRegex = /^\((.+?)\s*{--\s*(.+?)\)$/;
    const propertyRegex = /^\((.+?)\s*--}\s*(.+?)\)$/;
    const negationRegex = /^\(--,\s*(.+?)\)$/;
    const conjunctionRegex = /^\(&,\s*(.+?)\)$/;

    let match;

    // Handle nested terms by recursively parsing components
    if ((match = termKey.match(inheritanceRegex))) {
        const subject = match[1].trim();
        const predicate = match[2].trim();
        return {
            type: 'Inheritance', 
            subject: subject, 
            predicate: predicate,
            parsedSubject: parseTerm(subject),
            parsedPredicate: parseTerm(predicate)
        };
    }
    
    if ((match = termKey.match(implicationRegex))) {
        const subject = match[1].trim();
        const predicate = match[2].trim();
        return {
            type: 'Implication', 
            subject: subject, 
            predicate: predicate,
            parsedSubject: parseTerm(subject),
            parsedPredicate: parseTerm(predicate)
        };
    }
    
    if ((match = termKey.match(instanceRegex))) {
        const instance = match[1].trim();
        const classTerm = match[2].trim();
        return {
            type: 'Instance', 
            instance: instance, 
            class: classTerm,
            parsedInstance: parseTerm(instance),
            parsedClass: parseTerm(classTerm)
        };
    }
    
    if ((match = termKey.match(propertyRegex))) {
        const instance = match[1].trim();
        const property = match[2].trim();
        return {
            type: 'Property', 
            instance: instance, 
            property: property,
            parsedInstance: parseTerm(instance),
            parsedProperty: parseTerm(property)
        };
    }
    
    if ((match = termKey.match(negationRegex))) {
        const term = match[1].trim();
        return {
            type: 'Negation', 
            term: term,
            parsedTerm: parseTerm(term)
        };
    }
    
    if ((match = termKey.match(conjunctionRegex))) {
        // Handle conjunctions properly by splitting on commas but respecting nested parentheses
        const content = match[1];
        const terms = splitTerms(content);
        const parsedTerms = terms.map(term => parseTerm(term.trim()));
        return {type: 'Conjunction', terms: terms, parsedTerms: parsedTerms};
    }

    // If no specific structure is matched, treat it as an atomic term.
    if (!/^\(.*\)$/.test(termKey)) {
        return {type: 'Atomic', key: termKey};
    }

    return null; // Return null if it looks like a compound term but doesn't match any pattern
}

/**
 * Splits a comma-separated list of terms, respecting nested parentheses.
 * @param {string} content - The content to split.
 * @returns {string[]} Array of terms.
 */
function splitTerms(content) {
    const terms = [];
    let currentTerm = '';
    let parenDepth = 0;
    
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        
        if (char === '(') {
            parenDepth++;
            currentTerm += char;
        } else if (char === ')') {
            parenDepth--;
            currentTerm += char;
        } else if (char === ',' && parenDepth === 0) {
            terms.push(currentTerm.trim());
            currentTerm = '';
        } else {
            currentTerm += char;
        }
    }
    
    // Add the last term
    if (currentTerm.trim()) {
        terms.push(currentTerm.trim());
    }
    
    return terms;
}

module.exports = {parseTerm};
