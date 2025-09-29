import { createUnifiedErrorHandler } from './errorHandler.js';
import { debug } from './logger.js';
import { generateId } from './idGenerator.js';

const errorHandler = createUnifiedErrorHandler('NarseseTranslator');

/**
 * A utility class to handle the conversion between structured JavaScript objects
 * and Narsese statements, based on defined schemas.
 */
class NarseseTranslator {
    constructor(configAccessor) {
        this.config = configAccessor;
        debug('NarseseTranslator initialized.');
    }

    /**
     * Converts a JavaScript object into a set of Narsese beliefs based on a schema.
     * @param {object} data - The JavaScript object to convert.
     * @param {object} schema - The schema defining the mapping to Narsese.
     * @param {string} [subjectId] - The ID to use as the subject for the new beliefs.
     * @returns {Array<string>} An array of Narsese belief strings.
     */
    toNarsese(data, schema, subjectId) {
        return errorHandler.executeSync(() => {
            const id = subjectId || generateId();
            const beliefs = [];
            const schemaProps = schema.properties || {};

            for (const key in schemaProps) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    const value = data[key];
                    const predicate = schemaProps[key].mapsTo;
                    if (predicate) {
                        const valueStr = typeof value === 'string' ? `"${value}"` : value;
                        const belief = `<<(*, ${id}, ${predicate}) --> ${valueStr}>>.`;
                        beliefs.push(belief);
                    }
                }
            }
            debug(`Translated data for subject ${id} into ${beliefs.length} beliefs.`);
            return beliefs;
        }, `toNarsese:${subjectId || 'newData'}`, []);
    }

    /**
     * Extracts arguments from a Narsese statement into a JavaScript object based on a schema.
     * @param {object} statement - The parsed Narsese statement term.
     * @param {object} schema - The schema defining how to extract arguments.
     * @returns {object} A JavaScript object containing the extracted arguments.
     */
    fromNarsese(statement, schema) {
        const args = {};
        this._extractArgs(statement, schema, args);
        debug(`Extracted args from statement:`, args);
        return args;
    }

    _extractArgs(term, schema, args) {
        if (!term || !schema) return;

        if (schema.name) {
            args[schema.name] = this._termToValue(term);
        }

        if (schema.type && term.type !== schema.type) {
            return; // Type mismatch, stop recursion down this path
        }

        switch (term.type) {
            case 'Implication':
            case 'Equivalence':
                if (schema.subject) this._extractArgs(term.subject, schema.subject, args);
                if (schema.predicate) this._extractArgs(term.predicate, schema.predicate, args);
                break;
            case 'Conjunction':
            case 'Product':
            case 'ExtensionalSet':
            case 'IntensionalSet':
                if (schema.terms && Array.isArray(term.terms)) {
                    for (let i = 0; i < schema.terms.length; i++) {
                        this._extractArgs(term.terms[i], schema.terms[i], args);
                    }
                }
                break;
            case 'Operation':
                if (schema.term) this._extractArgs(term.term, schema.term, args);
                break;
        }
    }

    _termToValue(term) {
        if (!term) return null;
        if (term.type === 'Number') return term.value;
        if (term.type !== 'Atomic') return term.key; // For complex terms, return full Narsese string representation

        const key = term.key;
        if (key.startsWith('"') && key.endsWith('"')) {
            return key.slice(1, -1); // It's a string literal, so unquote it
        }
        return key; // It's an identifier
    }
}

export default NarseseTranslator;