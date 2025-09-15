import {parseTerm as parseWithMoo} from './narseseParser.js';
import {warn} from '../utils/logger.js';

/**
 * Centralized parsing utility for Narsese terms
 * This module provides a consistent interface for parsing terms throughout the system
 */

/**
 * Parse a Narsese term string into its structured representation
 * @param {string} termKey - The Narsese term string to parse
 * @returns {object|null} The parsed term structure or null if parsing fails
 */
function parseTerm(termKey) {
    if (typeof termKey !== 'string' || termKey.length === 0) {
        return null;
    }

    try {
        return parseWithMoo(termKey);
    } catch (error) {
        // Log parsing errors but don't throw to maintain backward compatibility
        warn(`Failed to parse term: ${termKey}`, error);
        return null;
    }
}

/**
 * Validate a term key before parsing
 * @param {string} termKey - The term key to validate
 * @returns {boolean} Whether the term key is valid
 */
function validateTermKey(termKey) {
    if (!termKey || typeof termKey !== 'string' || termKey.length === 0) {
        return false;
    }

    // Additional validation to catch invalid term keys that would cause parsing errors
    return !(termKey.includes('( --> )') || termKey.includes('( ==> )') ||
        termKey.includes('( <-> )') || termKey.includes('( <=> )'));
}

export {
    parseTerm,
    validateTermKey
};
