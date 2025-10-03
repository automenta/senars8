import {createUnifiedErrorHandler} from '@core/utils/errorHandler.js';
import agentService from '@/services/agentService';
import {
    createTaskFromStatement as coreCreateTask,
    validateNarseseStatement as coreValidate
} from '@core/utils/task-utils.js';

const uiErrorHandler = createUnifiedErrorHandler('UI');

export const validateNarseseStatement = coreValidate;
export const createTaskFromStatement = coreCreateTask;

export const formatCoreDataForUI = (data) => {
    if (!data) return null;
    if (Array.isArray(data)) {
        return data.map(item => formatCoreDataForUI(item));
    }
    if (typeof data === 'object') {
        if (data.term || data.punctuation) { // Simplified check for Task-like objects
            return {
                id: data.id || data.termKey,
                term: data.term?.toString() || data.termKey,
                punctuation: data.punctuation,
                priority: data.priority,
                creationTime: data.creationTime,
                truthValue: data.state?.truthValue || data.truthValue,
                occurrenceTime: data.occurrenceTime,
                type: 'task'
            };
        }
        if (data.key) { // Simplified check for Term-like objects
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

export const getAgentStateForUI = () => {
    try {
        const state = agentService.getAgentState();
        const connectionStats = agentService.getConnectionStats();
        return {
            isInitialized: connectionStats.isConnected,
            isActive: state.isRunning,
            beliefsCount: state.beliefs?.length || 0,
            goalsCount: state.goals?.length || 0,
            questionsCount: state.questions?.length || 0,
            tasksCount: state.tasks?.length || 0,
            cycleCount: state.cycleCount || 0,
            timestamp: Date.now()
        };
    } catch (error) {
        uiErrorHandler(error, 'getAgentStateForUI');
        return {
            isInitialized: false,
            isActive: false,
            beliefsCount: 0,
            goalsCount: 0,
            questionsCount: 0,
            tasksCount: 0,
            cycleCount: 0,
            timestamp: Date.now()
        };
    }
};

export const processNarseseThroughAgent = (narsese) => {
    try {
        if (!narsese || typeof narsese !== 'string' || narsese.trim().length === 0) {
            throw new Error('Narsese input is required and must be a non-empty string');
        }
        return agentService.sendNarsese(narsese);
    } catch (error) {
        uiErrorHandler(error, 'processNarseseThroughAgent');
        throw error;
    }
};

export const safeUICall = async (operation, operationName = 'UI Operation') => {
    try {
        return await operation();
    } catch (error) {
        uiErrorHandler(error, {
            operation: operationName,
            error: error.message,
            stack: error.stack
        });
        throw new Error(`Operation failed: ${error.message}`);
    }
};