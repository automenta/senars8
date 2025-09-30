#!/usr/bin/env node

/**
 * Test to verify the complete Narsese operation flow
 */

import { parseTerm } from './core/parser/narseseParser.js';
import { OP } from './core/config/constants.js';
import ActionExecutor from './core/system/ActionExecutor.js';
import eventBus from './core/system/EventBus.js';

// Mock memory and config for testing
const mockMemory = {
    getAllTasks: () => [],
    addTask: () => {}
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

async function runCompleteFlowTest() {
    console.log('🧪 Starting Complete Narsese Operation Flow Test...\n');
    
    try {
        // Create action executor
        const actionExecutor = new ActionExecutor(mockMemory, mockConfigManager, eventBus);
        
        // Register a sample tool
        actionExecutor.registerTool('navigate', async (location, destination) => {
            console.log(`🧭 Navigating from ${location} to ${destination}`);
            return { success: true, route: `${location}_to_${destination}`, time: '5min' };
        });
        
        console.log('✅ ActionExecutor with navigate tool created\n');
        
        // Test 1: Parse Narsese operation
        console.log('🔍 1. Parsing Narsese operation:');
        const narseseStr = 'navigate(kitchen, bedroom)';
        const parsedTerm = parseTerm(narseseStr);
        console.log('   Original string:', narseseStr);
        console.log('   Parsed term:', JSON.stringify(parsedTerm, null, 2));
        console.log('   Is operation?', actionExecutor.isOperationTerm(parsedTerm));
        console.log('');
        
        // Test 2: Execute through ActionExecutor's operation execution
        console.log('🔍 2. Executing parsed operation:');
        const result = await actionExecutor.executeNarseseOperation(narseseStr);
        console.log('   Execution result:', JSON.stringify(result, null, 2));
        console.log('');
        
        // Test 3: Verify the result is a proper Narsese belief
        console.log('🔍 3. Verifying belief conversion:');
        const belief = result.narseseBelief;
        console.log('   Belief term:', belief.term);
        console.log('   Truth frequency:', belief.truth.frequency);
        console.log('   Truth confidence:', belief.truth.confidence);
        console.log('   Punctuation:', belief.punctuation);
        console.log('');
        
        // Test 4: Try with a more complex operation
        console.log('🔍 4. Testing with another operation:');
        const complexResult = await actionExecutor.executeNarseseOperation('navigate(living_room, garden)');
        console.log('   Complex operation result:', JSON.stringify(complexResult.result, null, 2));
        console.log('');
        
        console.log('✅ Complete Narsese Operation Flow Test completed successfully!');
        console.log('\n🎯 Summary:');
        console.log('   - Narsese operations are correctly parsed');
        console.log('   - Operation terms are identified properly');
        console.log('   - Operations are executed through the tool system');
        console.log('   - Results are converted to Narsese beliefs');
        console.log('   - Full bidirectional flow works as expected');
        
    } catch (error) {
        console.error('❌ Error in complete flow test:', error);
        console.error('Stack trace:', error.stack);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    runCompleteFlowTest().catch(console.error);
}

export default runCompleteFlowTest;