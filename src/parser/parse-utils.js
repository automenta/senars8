import {parseTerm as parseWithMoo} from './narseseParser.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('parse-utils');

function parseTerm(termKey) {
    if (typeof termKey !== 'string' || !termKey.length) return null;
    return errorHandler.safeSync(() => parseWithMoo(termKey), `parseTerm: ${termKey}`, null);
}

const MALFORMED_PATTERNS = [
    /\(\s*-->\s*\)/, /\(\s*==>\s*\)/, /\(\s*<->\s*\)/, /\(\s*<=>\s*\)/,
    /\(\s*{\s*--\s*\)/, /\(\s*--\s*}\s*\)/, /\(\s*=\\>\s*\)/, /\(\s*=\/>\s*\)/,
    /\(\s*=<>\s*\)/, /\(--,\s*\)/, /\(\)/, /\(,\)/, /, \)/
].map(r => r.source).join('|');
const MALFORMED_REGEX = new RegExp(MALFORMED_PATTERNS);

function validateTermKey(termKey) {
    if (!termKey || typeof termKey !== 'string' || !termKey.length) return false;
    if (termKey.includes("(") && MALFORMED_REGEX.test(termKey)) return false;
    return true;
}

export {
    parseTerm,
    validateTermKey
};
