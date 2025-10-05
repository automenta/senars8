#!/usr/bin/env node

/**
 * Performance Test Script for Integration Tests
 * Verifies that optimizations are working correctly
 */

import {createWebSocketTestFixture} from '../utils/WebSocketTestUtils.js';
import {findAvailablePort} from '../utils/networkUtils.js';
import {createMessageHandler} from '../../agent/MessageHandler.js';

async function runPerformanceTest() {
    console.log('🧪 Running Integration Test Performance Verification...\n');

    const results = {
        setupTimes: [],
        clientCreationTimes: [],
        messageRoundtripTimes: [],
        cleanupTimes: []
    };

    try {
        // Test 1: WebSocket Fixture Setup Performance
        console.log('📋 Test 1: WebSocket Fixture Setup Performance');
        const port = await findAvailablePort(8100);

        const startTime = Date.now();
        const fixture = createWebSocketTestFixture(port, {
            connectionTimeout: 1500,
            messageTimeout: 800,
            setupTimeout: 8000,
            cleanupTimeout: 3000,
        });

        await fixture.setup(createMessageHandler);
        const setupTime = Date.now() - startTime;
        results.setupTimes.push(setupTime);
        console.log(`   ✅ Setup completed in ${setupTime}ms\n`);

        // Test 2: Parallel Client Creation Performance
        console.log('📋 Test 2: Parallel Client Creation Performance');
        const clientStartTime = Date.now();

        const clients = await fixture.createClients(3);
        const clientCreationTime = Date.now() - clientStartTime;
        results.clientCreationTimes.push(clientCreationTime);
        console.log(`   ✅ Created ${clients.length} clients in ${clientCreationTime}ms\n`);

        // Test 3: Message Roundtrip Performance
        console.log('📋 Test 3: Message Roundtrip Performance');
        const messageStartTime = Date.now();

        // Send messages to all clients in parallel
        const messagePromises = clients.map(async (client, index) => {
            const message = {type: 'ping', payload: {index}};
            const response = await fixture.sendAndExpect(
                client,
                message,
                (msg) => msg.type === 'pong',
                1000
            );
            return response;
        });

        const responses = await Promise.all(messagePromises);
        const messageTime = Date.now() - messageStartTime;
        results.messageRoundtripTimes.push(messageTime);
        console.log(`   ✅ ${responses.length} message roundtrips completed in ${messageTime}ms\n`);

        // Test 4: Cleanup Performance
        console.log('📋 Test 4: Cleanup Performance');
        const cleanupStartTime = Date.now();

        await fixture.cleanup();
        const cleanupTime = Date.now() - cleanupStartTime;
        results.cleanupTimes.push(cleanupTime);
        console.log(`   ✅ Cleanup completed in ${cleanupTime}ms\n`);

        // Performance Summary
        console.log('📊 Performance Summary:');
        console.log(`   Average Setup Time: ${Math.average(results.setupTimes)}ms`);
        console.log(`   Average Client Creation Time: ${Math.average(results.clientCreationTimes)}ms`);
        console.log(`   Average Message Roundtrip Time: ${Math.average(results.messageRoundtripTimes)}ms`);
        console.log(`   Average Cleanup Time: ${Math.average(results.cleanupTimes)}ms`);

        const totalTime = results.setupTimes[0] + results.clientCreationTimes[0] +
            results.messageRoundtripTimes[0] + results.cleanupTimes[0];
        console.log(`   Total Test Time: ${totalTime}ms`);

        // Performance Assessment
        console.log('\n🎯 Performance Assessment:');
        if (totalTime < 15000) {
            console.log('   ✅ EXCELLENT: Total time is under 15 seconds');
        } else if (totalTime < 25000) {
            console.log('   ⚠️  GOOD: Total time is under 25 seconds');
        } else {
            console.log('   ❌ NEEDS IMPROVEMENT: Total time is over 25 seconds');
        }

        if (results.clientCreationTimes[0] < 2000) {
            console.log('   ✅ EXCELLENT: Client creation is fast');
        } else if (results.clientCreationTimes[0] < 4000) {
            console.log('   ⚠️  GOOD: Client creation is acceptable');
        } else {
            console.log('   ❌ NEEDS IMPROVEMENT: Client creation is slow');
        }

        if (results.messageRoundtripTimes[0] < 3000) {
            console.log('   ✅ EXCELLENT: Message handling is fast');
        } else if (results.messageRoundtripTimes[0] < 5000) {
            console.log('   ⚠️  GOOD: Message handling is acceptable');
        } else {
            console.log('   ❌ NEEDS IMPROVEMENT: Message handling is slow');
        }

        console.log('\n✅ Integration Test Performance Verification completed successfully!');

    } catch (error) {
        console.error('❌ Error during performance test:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Helper function to calculate average
Math.average = (array) => {
    return Math.round(array.reduce((a, b) => a + b, 0) / array.length);
};

if (import.meta.url === `file://${process.argv[1]}`) {
    runPerformanceTest().catch(console.error);
}

export default runPerformanceTest;