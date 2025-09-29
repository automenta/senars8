import {OP} from '../../config/constants.js';

export default {
    [OP.ATOMIC]: pTerm => pTerm.key,
    [OP.INDEPENDENT_VARIABLE]: pTerm => pTerm.name,
    [OP.DEPENDENT_VARIABLE]: pTerm => `#${pTerm.name}`,
    [OP.QUERY_VARIABLE]: pTerm => `?${pTerm.name}`,
};