import AgentCommunicationService from '../services/AgentCommunicationService.js';
import {CONFIG} from '../constants/config.js';

/**
 * Diagnostic utility to test WebSocket connection to the agent
 */
export async function testConnection(url = CONFIG.CONNECTION.WEBSOCKET_URL) {
    console.log(`🔍 Testing WebSocket connection to: ${url}`);
    console.log(`📋 Connection settings:`, {
        url: url,
        reconnectAttempts: CONFIG.CONNECTION.MAX_RECONNECT_ATTEMPTS,
        reconnectDelay: CONFIG.CONNECTION.RECONNECT_DELAY,
        maxReconnectDelay: CONFIG.CONNECTION.MAX_RECONNECT_DELAY
    });
    
    const communicationService = new AgentCommunicationService(url);
    
    // Promise to resolve when we get connection status
    let _resolvePromise, _rejectPromise;
    const statusPromise = new Promise((_resolve, _reject) => {
        _resolvePromise = _resolve;
        _rejectPromise = _reject;
    });
    
    // Set up event listeners
    communicationService.on('status', (status) => {
        console.log(`📡 Connection status: ${status}`);
        if (status === 'connected') {
            console.log('✅ Successfully connected to agent!');
            _resolvePromise(true);
        } else if (status === 'connecting') {
            console.log('⏳ Attempting to connect...');
        } else if (status === 'failed') {
            console.log('❌ Failed to connect to agent');
            _rejectPromise(new Error('Connection failed'));
        } else if (status === 'disconnected') {
            console.log('🔌 Disconnected from agent');
        }
    });
    
    communicationService.on('error', (error) => {
        console.error('💥 Connection error occurred:', typeof error === 'object' ? error.message : error);
        _rejectPromise(new Error(`Connection error: ${typeof error === 'object' ? error.message : error}`));
    });
    
    // Attempt connection
    communicationService.connect();
    
    try {
        await Promise.race([
            statusPromise,
            new Promise((_resolve, _reject) => 
                setTimeout(() => _reject(new Error('Connection timeout after 10 seconds')), 10000)
            )
        ]);
        
        // Clean up
        communicationService.disconnect();
        console.log('🏁 Connection test completed successfully');
        return true;
    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
        communicationService.disconnect();
        return false;
    }
}

// If run directly
if (import.meta.url === new URL(import.meta.url).href) {
    const testUrl = process.argv[2] || CONFIG.CONNECTION.WEBSOCKET_URL;
    console.log(`Running connection diagnostic test...`);
    testConnection(testUrl).then(success => {
        process.exit(success ? 0 : 1);
        return success;
    }).catch(error => {
        console.error('Diagnostic test error:', error);
        process.exit(1);
        throw error;
    });
}