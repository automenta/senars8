// Import from common utilities to avoid duplication
import {idGeneratorUtils} from '@common/index.js';

// For backward compatibility, export same functions
const {
    generateSequentialId,
    generateHashId,
    generateOptimizedId,
    generateActionId,
    generatePlanId
} = idGeneratorUtils;

export {
    generateSequentialId,
    generateHashId,
    generateOptimizedId,
    generateActionId,
    generatePlanId
};