import {parseTerm as parseWithMoo} from './narseseParser.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('parse-utils');

function parseTerm(termKey) {
    if (typeof termKey !== 'string' || !termKey.length) return null;
    return errorHandler.executeSync(() => parseWithMoo(termKey), `parseTerm: ${termKey}`, null);
}

const MALFORMED_PATTERNS = [
    /\(\s*-->\s*\)/, /\(\s*==>\s*\)/, /\(\s*<->\s*\)/, /\(\s*<=>\s*\)/,
    /\(\s*{\s*--\s*\)/, /\(\s*--\s*}\s*\)/, /\(\s*=\\>\s*\)/, /\(\s*=\/>\s*\)/,
    /\(\s*=<>\s*\)/, /\(--,\s*\)/, /\(\)/, /\(,\)/, /, \)/
].map(r => r.source).join('|');
const MALFORMED_REGEX = new RegExp(MALFORMED_PATTERNS);

function validateTermKey(termKey) {
    return !termKey || typeof termKey !== 'string' || !termKey.length ? false : !(termKey.includes("(") && MALFORMED_REGEX.test(termKey));
}

export {
    parseTerm,
    validateTermKey
};
