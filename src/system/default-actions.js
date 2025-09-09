const {info} = require('../utils/logger');

const defaultActionHandlers = {
    'print_*': (action) => ({message: `PRINT ACTION: ${action.parameters.join(' ')}`}),
    'log': (action) => ({logged: true, parameters: action.parameters}),
    'achieve': (action) => ({achieved: action.parameters}),

    'create_*': (action) => {
        const objectType = action.name.replace('create_', '');
        return {created: objectType, parameters: action.parameters};
    },
    'update_*': (action) => {
        const objectType = action.name.replace('update_', '');
        return {updated: objectType, parameters: action.parameters};
    },
    'delete_*': (action) => {
        const objectType = action.name.replace('delete_', '');
        return {deleted: objectType, parameters: action.parameters};
    },
    'query_*': (action) => {
        const objectType = action.name.replace('query_', '');
        return {queried: objectType, result: `Results for ${objectType}`};
    },

    'analyze': (action) => ({analyzed: action.parameters}),
    'plan': (action) => ({planned: action.parameters}),
    'execute_*': (action) => {
        const command = action.name.replace('execute_', '');
        return {executed: command, status: 'completed'};
    },
    'learn_*': (action) => {
        const topic = action.name.replace('learn_', '');
        return {learned: topic, status: 'completed'};
    },
    'adapt': (action) => ({adapted: true, changes: action.parameters}),
    'optimize': (action) => ({optimized: true, metrics: action.parameters}),

    'navigate_*': (action) => {
        const destination = action.name.replace('navigate_', '');
        return {navigated: destination, status: 'completed'};
    },
    'communicate_*': (action) => {
        const recipient = action.name.replace('communicate_', '');
        return {communicated: recipient, message: action.parameters.join(' '), status: 'sent'};
    },
    'coordinate_*': (action) => {
        const entity = action.name.replace('coordinate_', '');
        return {coordinated: entity, status: 'completed'};
    },
};

function registerDefaultActions(actionExecutor) {
    for (const [pattern, handler] of Object.entries(defaultActionHandlers)) {
        actionExecutor.registerActionHandler(pattern, async (action) => {
            info(`Executing ${pattern}...`, action.parameters);
            return handler(action);
        });
    }

    actionExecutor.registerActionHandler('register_action', async (action) => {
        const [pattern, handlerName] = action.parameters;
        if (!pattern || !handlerName) {
            return {success: false, error: 'Pattern and handler name are required.'};
        }
        actionExecutor.registerActionHandler(pattern, async (act) => {
            info(`Dynamically registered action ${pattern} executed.`, act.parameters);
            return {success: true, registered_action: pattern};
        });
        info(`ACTION: Dynamically registered new action handler for "${pattern}"`);
        return {success: true, registered: pattern};
    });
}

module.exports = registerDefaultActions;
