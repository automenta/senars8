import {UnifiedWebSocketServer} from './StandaloneWebSocketServer.js';

export class WebSocketManager extends UnifiedWebSocketServer {
    constructor(options) {
        super(options);
    }
}