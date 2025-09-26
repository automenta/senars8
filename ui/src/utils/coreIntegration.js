// UI Utilities for Core Module Integration
import {createUnifiedErrorHandler} from '@core/utils/errorHandler.js';
import agentIntegrationService from '@/services/agentIntegration.js';
import {
    createTaskFromStatement as coreCreateTask,
    validateNarseseStatement as coreValidate
} from '@common/utils/coreUtils.js';

// Create a unified error handler for UI components
const uiErrorHandler = createUnifiedErrorHandler('UI');

// Re-export the shared validation and task creation functions
export const validateNarseseStatement = coreValidate;
export const createTaskFromStatement = coreCreateTask;

// Utility functions for processing core data for UI display
export const formatCoreDataForUI = (data) => {
    if (!data) return null;

    if (Array.isArray(data)) {
        return data.map(item => formatCoreDataForUI(item));
    }

    if (typeof data === 'object') {
        if (data.__proto__?.constructor?.name === 'Task' || data.term || data.punctuation) {
            return {
                id: data.id || data.termKey,
                term: data.term ? data.term.toString() : data.termKey,
                punctuation: data.punctuation,
                priority: data.priority,
                creationTime: data.creationTime,
                truthValue: data.state?.truthValue || data.truthValue,
                occurrenceTime: data.occurrenceTime,
                type: 'task'
            };
        }

        if (data.__proto__?.constructor?.name === 'Term' || data.key) {
            return {
                key: data.key,
                type: data.type,
                terms: Array.isArray(data.terms) ? data.terms.map(formatCoreDataForUI) : data.terms,
                toString: data.toString?.() || data.key,
                type: 'term'
            };
        }
    }

    return data;
};

// Get agent state information for UI
export const getAgentStateForUI = () => {
    try {
        return agentIntegrationService.getAgentInfo();
    } catch (error) {
        uiErrorHandler(error, 'getAgentStateForUI');
        return {
            isInitialized: false,
            isActive: false,
            beliefsCount: 0,
            goalsCount: 0,
            questionsCount: 0,
            timestamp: Date.now()
        };
    }
};

// Process Narsese through the agent
export const processNarseseThroughAgent = async (narsese) => {
    try {
        if (!narsese || typeof narsese !== 'string' || narsese.trim().length === 0) {
            throw new Error('Narsese input is required and must be a non-empty string');
        }

        await agentIntegrationService.initialize();
        return await agentIntegrationService.processNarsese(narsese);
    } catch (error) {
        uiErrorHandler(error, 'processNarseseThroughAgent');
        throw error;
    }
};

// Enhanced error handling wrapper for UI operations
export const safeUICall = async (operation, operationName = 'UI Operation') => {
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