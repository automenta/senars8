// UI Utilities for Core Module Integration
import {Task, Term, parseTerm, error as coreError, info as coreInfo, debug as coreDebug} from '@core/index.js';
import {createUnifiedErrorHandler} from '@core/utils/errorHandler.js';

// Create a unified error handler for UI components
const uiErrorHandler = createUnifiedErrorHandler('UI');

// Enhanced validation utilities
const validateNarseseStatement = (statement) => {
    if (!statement || typeof statement !== 'string') {
        return { valid: false, error: 'Statement must be a non-empty string' };
    }
    
    const trimmed = statement.trim();
    if (!trimmed) {
        return { valid: false, error: 'Statement cannot be empty' };
    }
    
    // Check if it's a valid Narsese statement format
    if (!trimmed.includes('.') && !trimmed.includes('!') && !trimmed.includes('?')) {
        return { valid: false, error: 'Statement must end with . (belief), ! (goal), or ? (question)' };
    }
    
    // Try to parse the term
    try {
        const parsed = parseTerm(trimmed);
        if (!parsed) {
            return { valid: false, error: 'Invalid Narsese syntax' };
        }
        
        return { valid: true, parsed };
    } catch (parseError) {
        return { valid: false, error: `Parse error: ${parseError.message}` };
    }
};

// Enhanced task creation utility
const createTaskFromStatement = (statement, defaultPriority = 0.5) => {
    const validation = validateNarseseStatement(statement);
    
    if (!validation.valid) {
        throw new Error(`Cannot create task: ${validation.error}`);
    }
    
    const trimmed = statement.trim();
    const punctuation = trimmed[trimmed.length - 1];
    const term = validation.parsed;
    
    return new Task(term, punctuation, { priority: defaultPriority });
};

// Enhanced error handling wrapper for UI operations
const safeUICall = async (operation, operationName = 'UI Operation') => {
    try {
        return await operation();
    } catch (error) {
        uiErrorHandler(error, {
            operation: operationName,
            error: error.message,
            stack: error.stack
        });
        
        // Re-throw with more user-friendly message
        throw new Error(`Operation failed: ${error.message}`);
    }
};

// Format core data for UI display
const formatCoreDataForUI = (coreData) => {
    if (!coreData) return null;
    
    // Format task data
    if (coreData.hasOwnProperty('termKey') && coreData.hasOwnProperty('punctuation')) {
        return {
            id: coreData.id,
            statement: coreData.termKey,
            punctuation: coreData.punctuation,
            priority: coreData.priority || 0,
            truthValue: coreData.state?.truthValue || null,
            occurrenceTime: coreData.state?.occurrenceTime || null,
            type: 'task'
        };
    }
    
    // Format term data
    if (coreData.hasOwnProperty('key') && coreData.hasOwnProperty('type')) {
        return {
            id: coreData.id,
            key: coreData.key,
            type: coreData.type,
            components: coreData.components || [],
            complexity: coreData.complexity || 1,
            type: 'term'
        };
    }
    
    return coreData;
};

// Export utilities
export {
    validateNarseseStatement,
    createTaskFromStatement,
    safeUICall,
    formatCoreDataForUI,
    uiErrorHandler
};

// Export core components with enhanced UI integration
export { Task, Term, parseTerm, coreError, coreInfo, coreDebug };