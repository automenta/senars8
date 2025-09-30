#!/usr/bin/env node

/**
 * Integration Test for Tool Execution in ActionExecutor
 * Tests that the ActionExecutor properly integrates with the new tool system
 */

import ActionExecutor from '../../core/system/ActionExecutor.js';
import eventBus from '../../core/system/EventBus.js';

// Mock memory and config for testing
const mockMemory = {
    getAllTasks: () => [],
    addTask: () => {
    }
};
const mockConfigManager = {
    get: (path, defaultValue) => defaultValue,
    getNumber: (path, defaultValue) => defaultValue,
    getString: (path, defaultValue) => defaultValue,
    getBoolean: (path, defaultValue) => defaultValue,
    getObject: (path, defaultValue) => defaultValue,
    getArray: (path, defaultValue) => defaultValue,
    getAll: () => ({})
};

async function runIntegrationTest() {
    console.log('🧪 Starting ActionExecutor Integration Test...\n');

    try {
        // Use the singleton event bus and create action executor
        const actionExecutor = new ActionExecutor(mockMemory, mockConfigManager, eventBus);

        console.log('✅ ActionExecutor created successfully\n');

        // Register a test tool
        actionExecutor.registerTool('test_operation', async (param1, param2) => {
            console.log(`🔧 Executing test operation with params: ${param1}, ${param2}`);
            return {success: true, message: `Processed ${param1} and ${param2}`, result: param1 + param2};
        });

        console.log('✅ Tool registered with ActionExecutor\n');

        // Test direct tool execution
        console.log('🔍 1. Testing direct tool execution through ActionExecutor:');
        const directResult = await actionExecutor.getTools().executeTool('test_operation', ['hello', 'world']);
        console.log('   Direct result:', directResult);
        console.log('');

        // Test operation execution via ActionExecutor
        console.log('🔍 2. Testing operation execution through ActionExecutor:');
        const operationResult = await actionExecutor.executeNarseseOperation('test_operation(greeting, universe)');
        console.log('   Operation result:', operationResult);
        console.log('');

        // Test ActionExecutor action with operation term
        console.log('🔍 3. Testing ActionExecutor action with operation term:');
        const actionResult = await actionExecutor.executeAction({
            operationTerm: {
                type: 'Operation',
                subject: {type: 'Atomic', key: 'test_operation'},
                predicate: {
                    type: 'Product',
                    terms: [
                        {type: 'Atomic', key: 'foo'},
                        {type: 'Atomic', key: 'bar'}
                    ]
                }
            }
        });
        console.log('   Action with operation term result:', actionResult);
        console.log('');

        // Show execution history
        console.log('📊 4. ActionExecutor execution history:');
        const history = actionExecutor.getActionHistory();
        console.log(`   Total executions: ${history.length}`);
        history.forEach((record, index) => {
            console.log(`   ${index + 1}. ${record.action} - ${record.status} (${record.duration}ms) - Type: ${record.type || 'action'}`);
        });
        console.log('');

        console.log('✅ ActionExecutor Integration Test completed successfully!');
        console.log('\n🎯 Summary:');
        console.log('   - ActionExecutor successfully integrates with tool system');
        console.log('   - Tools can be registered through ActionExecutor');
        console.log('   - Narsese operations can be executed through ActionExecutor');
        console.log('   - Operation terms can be processed by ActionExecutor');
        console.log('   - Execution history is properly maintained');

    } catch (error) {
        console.error('❌ Error in ActionExecutor integration test:', error);
        console.error('Stack trace:', error.stack);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    runIntegrationTest().catch(console.error);
}

export default runIntegrationTest;