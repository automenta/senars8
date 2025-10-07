/**
 * Browser-specific connection manager
 * This version only handles WebSocket connections and avoids server-side dependencies
 */

import {EventEmitter} from 'events';
import logger from '../coreagent/utils/logger.js';

const log = logger.create('BrowserConnectionManager');

const DEFAULT_CONFIG = {
    maxRetries: 3,
    baseDelay: 200,
    connectionTimeout: 1500,
    defaultHost: 'localhost',
    defaultPort: parseInt(process.env.WS_PORT || 8081, 10)
};

class BrowserConnectionManager extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {...DEFAULT_CONFIG, ...config};
        this.connections = new Map();
        this.isDestroyed = false;
    }

    connect(url) {
        if (this.isDestroyed) throw new Error('BrowserConnectionManager destroyed');
        if (this.connections.has(url)) return this.connections.get(url);

        const ws = new WebSocket(url);
        this._setupConnectionHandlers(ws, url);
        return ws;
    }

    _setupConnectionHandlers(ws, url) {
        ws.onopen = () => {
            if (this.isDestroyed) return;
            this.connections.set(url, ws);
            this.emit('connection', {url, status: 'connected'});
            this.emit('update');
        };

        ws.onmessage = (event) => {
            if (this.isDestroyed) return;
            this.emit('message', {url, data: event.data});
        };

        ws.onclose = (event) => {
            if (this.isDestroyed) return;
            this.connections.delete(url);
            this.emit('disconnection', {url, status: 'disconnected', code: event.code, reason: event.reason});
            this.emit('update');
        };

        ws.onerror = (error) => {
            if (this.isDestroyed) return;
            this.emit('error', {url, error});
        };
    }

    send(url, data) {
        const connection = this.connections.get(url);
        if (!connection) return false;

        try {
            if (connection.readyState === WebSocket.OPEN) {
                connection.send(JSON.stringify(data));
                return true;
            }
            return false;
        } catch (error) {
            this.emit('error', {url, error});
            return false;
        }
    }

    async disconnect(url, code = 1000, reason = 'Client disconnect') {
        const connection = this.connections.get(url);
        if (!connection) return false;

        connection.close(code, reason);
        this.connections.delete(url);
        return true;
    }

    async disconnectAll(code = 1000, reason = 'Manager shutdown') {
        const disconnectPromises = [];
        for (const [url, connection] of this.connections) {
            disconnectPromises.push(
                new Promise(resolve => {
                    try {
                        connection.close(code, reason);
                        resolve(true);
                    } catch (error) {
                        this.emit('error', {url, error});
                        resolve(false);
                    }
                })
            );
        }
        await Promise.all(disconnectPromises);
        this.connections.clear();
    }

    getConnections() {
        return Array.from(this.connections.entries()).map(([url, connection]) => {
            return {
                url,
                status: this._getConnectionStatus(connection.readyState),
                readyState: connection.readyState,
                type: 'websocket'
            };
        });
    }

    _getConnectionStatus(readyState) {
        const states = {
            [WebSocket.CONNECTING]: 'connecting',
            [WebSocket.OPEN]: 'connected',
            [WebSocket.CLOSING]: 'closing',
            [WebSocket.CLOSED]: 'closed'
        };
        return states[readyState] || 'unknown';
    }

    async destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;
        await this.disconnectAll();
        this.connections.clear();
        this.removeAllListeners();
    }

    isHealthy() {
        return !this.isDestroyed;
    }
}

export const browserConnectionManager = new BrowserConnectionManager();

export function createBrowserConnectionManager(config = {}) {
    return new BrowserConnectionManager(config);
}

export {BrowserConnectionManager};