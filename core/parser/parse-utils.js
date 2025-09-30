import {parseTerm as parseWithMoo} from './narseseParser.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('parse-utils');

function parseTerm(termKey) {
    if (typeof termKey !== 'string' || !termKey.length) return null;
    return errorHandler.executeSync(() => parseWithMoo(termKey), `parseTerm: ${termKey}`, null);
}

function parseTermInner(termKey) {
    // For inner operations, return null instead of going through error handler
    if (typeof termKey !== 'string' || !termKey.length) return null;
    try {
        return parseWithMoo(termKey);
    } catch {
        return null;
    }
}

const MALFORMED_PATTERNS = [
    /\(\s*-->\s*\)/, /\(\s*==>\s*\)/, /\(\s*<->\s*\)/, /\(\s*<=>\s*\)/,
    /\(\s*{\s*--\s*\)/, /\(\s*--\s*}\s*\)/, /\(\s*=\\>\s*\)/, /\(\s*=\/>\s*\)/,
    /\(\s*=<>\s*\)/, /\(--,\s*\)/, /\(,\)/, /, \)/,
    /\(\s*\^\s*\,\s*\)/  // Empty operation: (^,) or (^ ,)
].map(r => r.source).join('|');
const MALFORMED_REGEX = new RegExp(MALFORMED_PATTERNS);

function validateTermKey(termKey) {
    if (!termKey || typeof termKey !== 'string' || !termKey.length) return false;

    // Check for malformed patterns
    if (termKey.includes("(") && MALFORMED_REGEX.test(termKey)) {
        return false;
    }

    // Check for potential DoS with too many nested parentheses
    let parenDepth = 0;
    let maxDepth = 0;
    for (let char of termKey) {
        if (char === '(') {
            parenDepth++;
            maxDepth = Math.max(maxDepth, parenDepth);
        } else if (char === ')') {
            parenDepth--;
            if (parenDepth < 0) return false; // Unbalanced parentheses
        }
    }
    if (maxDepth > 50) return false; // Prevent extremely deep nesting

    // Check for potential DoS with repeated operators 
    const operationMatches = termKey.match(/\^/g);
    if (operationMatches && operationMatches.length > 100) return false; // Too many operations

    return true;
}

function validateTermKeyInner(termKey) {
    // For inner operations, simplified validation that returns boolean
    if (!termKey || typeof termKey !== 'string' || !termKey.length) return false;
    // Skip complex regex check for performance in inner operations
    return true;
}

export {
    parseTerm,
    parseTermInner,
    validateTermKey,
    validateTermKeyInner
};
