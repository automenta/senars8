/**
 * Agent module exports
 * Provides agent functionality using the coreagent architecture
 */

// Main agent classes
export {Agent} from './Agent.js';
export {AgentManager} from './AgentManager.js';
export {WebSocketManager} from './WebSocketManager.js';
export {UnifiedWebSocketServer} from './StandaloneWebSocketServer.js';

// Message handling
export {createMessageHandler, createWebSocketMessageHandler} from './MessageHandler.js';

// Default export
export {Agent as default};