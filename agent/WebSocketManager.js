import {UnifiedWebSocketServer} from './StandaloneWebSocketServer.js';

/**
 * WebSocket manager that uses the unified server implementation.
 * Simplified wrapper around UnifiedWebSocketServer for backward compatibility.
 */
export class WebSocketManager extends UnifiedWebSocketServer {
    constructor(options) {
        super(options);
    }
}