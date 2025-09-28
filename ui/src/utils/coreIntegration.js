import {createUnifiedErrorHandler} from '@core/utils/errorHandler.js';
import agentService from '@/services/agentService';
import {
    createTaskFromStatement as coreCreateTask,
    validateNarseseStatement as coreValidate
} from '@common/utils/coreUtils.js';
import {formatCoreDataForUI} from '@common/utils/uiFormatting.js';

const uiErrorHandler = createUnifiedErrorHandler('UI');

export const validateNarseseStatement = coreValidate;
export const createTaskFromStatement = coreCreateTask;

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
    } catch (error)
    _
    {
        uiErrorHandler(error, {
            operation: operationName,
            error: error.message,
            stack: error.stack
        });
        throw new Error(`Operation failed: ${error.message}`);
    }
};