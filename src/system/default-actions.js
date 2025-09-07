function registerDefaultActions(actionExecutor) {
    // Register default action handlers
    actionExecutor.registerActionHandler('print_*', async (action) => {
        const message = action.parameters.join(' ');
        console.log(`PRINT ACTION: ${message}`);
        return { message };
    });

    actionExecutor.registerActionHandler('log', async (action) => {
        console.log('LOG ACTION:', action.parameters);
        return { logged: true };
    });

    actionExecutor.registerActionHandler('achieve', async (action) => {
        console.log('ACHIEVE ACTION:', action.parameters);
        return { achieved: action.parameters };
    });

    // Register additional action handlers
    actionExecutor.registerActionHandler('create_*', async (action) => {
        const objectType = action.name.replace('create_', '');
        console.log(`CREATE ACTION: Creating ${objectType}`, action.parameters);
        return { created: objectType, parameters: action.parameters };
    });

    actionExecutor.registerActionHandler('update_*', async (action) => {
        const objectType = action.name.replace('update_', '');
        console.log(`UPDATE ACTION: Updating ${objectType}`, action.parameters);
        return { updated: objectType, parameters: action.parameters };
    });

    actionExecutor.registerActionHandler('delete_*', async (action) => {
        const objectType = action.name.replace('delete_', '');
        console.log(`DELETE ACTION: Deleting ${objectType}`, action.parameters);
        return { deleted: objectType, parameters: action.parameters };
    });

    actionExecutor.registerActionHandler('query_*', async (action) => {
        const objectType = action.name.replace('query_', '');
        console.log(`QUERY ACTION: Querying ${objectType}`, action.parameters);
        // Simulate a query result
        return { queried: objectType, result: `Results for ${objectType} with params ${JSON.stringify(action.parameters)}` };
    });

    actionExecutor.registerActionHandler('analyze', async (action) => {
        console.log('ANALYZE ACTION:', action.parameters);
        return { analyzed: action.parameters, insights: `Analysis of ${action.parameters.join(', ')} completed` };
    });

    actionExecutor.registerActionHandler('plan', async (action) => {
        console.log('PLAN ACTION:', action.parameters);
        return {
            planned: action.parameters,
            steps: [`Step 1 for ${action.parameters.join(', ')}`, `Step 2 for ${action.parameters.join(', ')}`]
        };
    });

    actionExecutor.registerActionHandler('execute_*', async (action) => {
        const command = action.name.replace('execute_', '');
        console.log(`EXECUTE ACTION: Executing ${command}`, action.parameters);
        return { executed: command, parameters: action.parameters, status: 'completed' };
    });

    // Register advanced action handlers
    actionExecutor.registerActionHandler('navigate_*', async (action) => {
        const destination = action.name.replace('navigate_', '');
        console.log(`NAVIGATE ACTION: Navigating to ${destination}`, action.parameters);
        return { navigated: destination, path: `path_to_${destination}`, status: 'completed' };
    });

    actionExecutor.registerActionHandler('communicate_*', async (action) => {
        const recipient = action.name.replace('communicate_', '');
        console.log(`COMMUNICATE ACTION: Communicating with ${recipient}`, action.parameters);
        return { communicated: recipient, message: action.parameters.join(' '), status: 'sent' };
    });

    actionExecutor.registerActionHandler('learn_*', async (action) => {
        const topic = action.name.replace('learn_', '');
        console.log(`LEARN ACTION: Learning about ${topic}`, action.parameters);
        return { learned: topic, knowledge: `knowledge_about_${topic}`, status: 'completed' };
    });

    actionExecutor.registerActionHandler('adapt', async (action) => {
        console.log('ADAPT ACTION: Adapting to new conditions', action.parameters);
        return { adapted: true, changes: action.parameters, status: 'completed' };
    });

    actionExecutor.registerActionHandler('optimize', async (action) => {
        console.log('OPTIMIZE ACTION: Optimizing performance', action.parameters);
        return { optimized: true, metrics: action.parameters, status: 'completed' };
    });

    actionExecutor.registerActionHandler('coordinate_*', async (action) => {
        const entity = action.name.replace('coordinate_', '');
        console.log(`COORDINATE ACTION: Coordinating with ${entity}`, action.parameters);
        return { coordinated: entity, plan: action.parameters, status: 'completed' };
    });
}

module.exports = registerDefaultActions;
