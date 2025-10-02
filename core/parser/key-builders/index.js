import atomicBuilders from './atomic.js';
import createInfixBuilders from './infix.js';
import createUnaryBuilders from './unary.js';
import createListBuilders from './list.js';

/**
 * Creates a comprehensive key builder object by combining all individual builders.
 * The termKey function is injected to avoid circular dependencies.
 *
 * @param {Function} termKey - The function to generate a term key for a parsed term.
 * @returns {object} The complete key builder object.
 */
const createKeyBuilder = (termKey) => {
    const infixBuilders = createInfixBuilders(termKey);
    const unaryBuilders = createUnaryBuilders(termKey);
    const listBuilders = createListBuilders(termKey);

    return {
        ...atomicBuilders,
        ...infixBuilders,
        ...unaryBuilders,
        ...listBuilders,
    };
};

export default createKeyBuilder;