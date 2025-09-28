// Import from common utilities to avoid duplication
import {mathUtils} from '@common/index.js';

// For backward compatibility, export same functions
const {cosineSimilarity, embeddingsEqual} = mathUtils;

export {
    cosineSimilarity,
    embeddingsEqual
};
