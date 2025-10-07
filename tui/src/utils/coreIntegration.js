import {createUnifiedErrorHandler} from '@senars/core/utils/errorHandler.js';
import {
    createTaskFromStatement as coreCreateTask,
    validateNarseseStatement as coreValidate
} from '@senars/core/utils/task-utils.js';

const tuiErrorHandler = createUnifiedErrorHandler('TUI');

export const validateNarseseStatement = coreValidate;
export const createTaskFromStatement = coreCreateTask;

export const formatCoreDataForTUI = (data) => {
    if (!data) return null;
    if (Array.isArray(data)) {
        return data.map(item => formatCoreDataForTUI(item));
    }
    if (typeof data === 'object') {
        if (data.term || data.punctuation) { // Task-like objects
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
        if (data.key) { // Term-like objects
            return {
                key: data.key,
                type: data.type,
                terms: Array.isArray(data.terms) ? data.terms.map(formatCoreDataForTUI) : data.terms,
                toString: data.toString?.() || data.key,
                type: 'term'
            };
        }
    }
    return data;
};

export const getAgentStateForTUI = (agent) => {
    try {
        if (!agent || !agent.apiService) {
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

        const state = agent.apiService.getAgentState();
        const connectionStats = agent.apiService.getConnectionStats();
        return {
            isInitialized: connectionStats?.isConnected || false,
            isActive: state.isRunning,
            beliefsCount: state.beliefs?.length || 0,
            goalsCount: state.goals?.length || 0,
            questionsCount: state.questions?.length || 0,
            tasksCount: state.tasks?.length || 0,
            cycleCount: state.cycleCount || 0,
            timestamp: Date.now()
        };
    } catch (error) {
        tuiErrorHandler(error, 'getAgentStateForTUI');
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

export const processNarseseThroughAgent = async (agent, narsese) => {
    try {
        if (!agent || !narsese || typeof narsese !== 'string' || narsese.trim().length === 0) {
            throw new Error('Agent and Narsese input are required and must be a non-empty string');
        }
        return await agent.apiService.sendNarsese(narsese);
    } catch (error) {
        tuiErrorHandler(error, 'processNarseseThroughAgent');
        throw error;
    }
};

export const safeTUICall = async (operation, operationName = 'TUI Operation') => {
    try {
        return await operation();
    } catch (error) {
        tuiErrorHandler(error, {
            operation: operationName,
            error: error.message,
            stack: error.stack
        });
        throw new Error(`Operation failed: ${error.message}`);
    }
};

// Task formatting specific to TUI display
export const formatTaskForTUIDisplay = (task) => {
    const formatted = formatCoreDataForTUI(task);
    if (!formatted) return null;

    return {
        ...formatted,
        displayText: `${formatted.term} ${formatted.punctuation || '.'}`,
        color: formatted.punctuation === '!' ? 'red' :
            formatted.punctuation === '?' ? 'yellow' : 'white'
    };
};

// Format tasks grouped by type for TUI display
export const groupTasksByType = (tasks) => {
    const beliefs = [];
    const goals = [];
    const questions = [];
    const other = [];

    if (!Array.isArray(tasks)) return {beliefs, goals, questions, other};

    tasks.forEach(task => {
        const formatted = formatTaskForTUIDisplay(task);
        if (!formatted) return;

        switch (formatted.punctuation) {
            case '.':
                beliefs.push(formatted);
                break;
            case '!':
                goals.push(formatted);
                break;
            case '?':
                questions.push(formatted);
                break;
            default:
                other.push(formatted);
                break;
        }
    });

    return {beliefs, goals, questions, other};
};