import { CONTRADICTION_TYPES } from '../../contradiction-types.js';

function analyzeDirectNegation(task1, task2, parsed1, parsed2) {
    const check = (p1, p2, t1, t2) => {
        if (p1.type !== 'Negation') { return null; }
        const innerTermKey = p1.key.substring(p1.key.indexOf(',') + 1, p1.key.length - 1).trim();
        if (innerTermKey === t2.termKey) {
            return {
                type: CONTRADICTION_TYPES.DIRECT_NEGATION,
                details: `Direct negation: "${t1.termKey}" vs "${t2.termKey}"`
            };
        }
        return null;
    };
    return check(parsed1, parsed2, task1, task2) || check(parsed2, parsed1, task2, task1);
}

export default analyzeDirectNegation;
