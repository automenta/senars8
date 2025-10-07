import {OP} from '../../../core/config/constants.js';

export default {
    [OP.ATOMIC]: pTerm => pTerm.key,
    [OP.NUMBER]: pTerm => String(pTerm.value),
    [OP.INDEPENDENT_VARIABLE]: pTerm => pTerm.name,
    [OP.DEPENDENT_VARIABLE]: pTerm => `#${pTerm.name}`,
    [OP.QUERY_VARIABLE]: pTerm => `?${pTerm.name}`,
};