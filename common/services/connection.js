import WebSocket from 'ws';
import {EventEmitter} from 'events';
import logger from '../../core/utils/logger.js';
import EmbeddedAgentService from './EmbeddedAgentService.js';

const log = logger.create('ConnectionManager');

const DEFAULT_CONFIG = {
    maxRetries: 3,
    baseDelay: 200,
    connectionTimeout: 1500,
    defaultHost: 'localhost',
    defaultPort: parseInt(process.env.WS_PORT, 10) || 8081
};

class ConnectionManager extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {...DEFAULT_CONFIG, ...config};
        this.connections = new Map();
        this.isDestroyed = false;
        this.embeddedService = null;
    }

    async discover(port, host) {
        if (this.isDestroyed) throw new Error('ConnectionManager destroyed');

        const targetPort = port || this.config.defaultPort;
        const targetHost = host || this.config.defaultHost;
        const wsUrl = `ws://${targetHost}:${targetPort}`;

        log.info(`Discovering agent at ${wsUrl}`);

        const result = await this._attemptConnection(wsUrl);

        if (result.success) {
            log.info(`Connected to ${wsUrl}`);
        } else {
            log.warn(`Discovery failed for ${wsUrl}: ${result.error.message}`);
            this.emit('error', {url: wsUrl, error: result.error});
        }
    }

    /**
     * Create an embedded (in-process) agent connection
     */
    async createEmbedded() {
        if (this.isDestroyed) throw new Error('ConnectionManager destroyed');

        if (this.embeddedService) {
            log.warn('Embedded service already exists');
            return this.embeddedService;
        }

        log.info('Creating embedded agent connection');

        try {
            this.embeddedService = new EmbeddedAgentService();

            // Set up event forwarding for embedded service
            this._setupEmbeddedEventHandlers(this.embeddedService);

            await this.embeddedService.initialize();
            this.connections.set('embedded', this.embeddedService);

            log.info('Embedded agent connection created successfully');
            this.emit('connection', {url: 'embedded', status: 'connected'});
            this.emit('update');

            return this.embeddedService;
        } catch (error) {
            log.error('Failed to create embedded connection:', error);
            this.emit('error', {url: 'embedded', error});
            throw error;
        }
    }

    async _attemptConnection(wsUrl) {
        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                log.debug(`Attempt ${attempt}/${this.config.maxRetries} to ${wsUrl}`);
                const ws = this.connect(wsUrl);
                await this._waitForConnection(ws, wsUrl);
                return {success: true};
            } catch (error) {
                log.debug(`Attempt ${attempt} failed: ${error.message}`);
                if (attempt === this.config.maxRetries) {
                    return {success: false, error: new Error(`Failed after ${this.config.maxRetries} attempts`)};
                }
                const delay = this.config.baseDelay * Math.pow(2, attempt - 1);
                await this._delay(delay);
            }
        }
    }

    _waitForConnection(ws, wsUrl) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), this.config.connectionTimeout);
            ws.on('open', () => {
                clearTimeout(timeout);
                resolve();
            });
            ws.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    connect(url) {
        if (this.isDestroyed) throw new Error('ConnectionManager destroyed');
        if (this.connections.has(url)) return this.connections.get(url);

        const ws = new WebSocket(url);
        this._setupConnectionHandlers(ws, url);
        return ws;
    }

    _setupConnectionHandlers(ws, url) {
        ws.on('open', () => {
            if (this.isDestroyed) return;
            this.connections.set(url, ws);
            this.emit('connection', {url, status: 'connected'});
            this.emit('update');
        });

        ws.on('message', (data) => {
            if (this.isDestroyed) return;
            this.emit('message', {url, data: data.toString()});
        });

        ws.on('close', (code, reason) => {
            if (this.isDestroyed) return;
            this.connections.delete(url);
            this.emit('disconnection', {url, status: 'disconnected', code, reason});
            this.emit('update');
        });

        ws.on('error', (error) => {
            if (this.isDestroyed) return;
            this.emit('error', {url, error});
        });
    }

    _setupEmbeddedEventHandlers(embeddedService) {
        embeddedService.on('message', ({data}) => {
            if (this.isDestroyed) return;
            this.emit('message', {url: 'embedded', data});
        });

        embeddedService.on('error', (error) => {
            if (this.isDestroyed) return;
            this.emit('error', {url: 'embedded', error});
        });

        embeddedService.on('initialized', () => {
            if (this.isDestroyed) return;
            this.emit('connection', {url: 'embedded', status: 'connected'});
            this.emit('update');
        });

        embeddedService.on('started', () => {
            if (this.isDestroyed) return;
            this.emit('connection', {url: 'embedded', status: 'connected'});
        });

        embeddedService.on('stopped', () => {
            if (this.isDestroyed) return;
            this.emit('disconnection', {url: 'embedded', status: 'disconnected'});
        });
    }

    send(url, data) {
        const connection = this.connections.get(url);
        if (!connection) return false;

        try {
            if (url === 'embedded' && connection instanceof EmbeddedAgentService) {
                // Handle embedded service
                connection.sendMessage(data.type, data.payload);
                return true;
            } else if (connection.readyState === WebSocket.OPEN) {
                // Handle WebSocket connection
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

        try {
            if (url === 'embedded' && connection instanceof EmbeddedAgentService) {
                // Handle embedded service
                await connection.destroy();
                this.connections.delete(url);
                return true;
            } else {
                // Handle WebSocket connection
                connection.close(code, reason);
                return true;
            }
        } catch (error) {
            this.connections.delete(url);
            return false;
        }
    }

    async disconnectAll(code = 1000, reason = 'Manager shutdown') {
        const disconnectPromises = [];
        for (const url of this.connections.keys()) {
            disconnectPromises.push(this.disconnect(url, code, reason));
        }
        await Promise.all(disconnectPromises);
    }

    getConnections() {
        return Array.from(this.connections.entries()).map(([url, connection]) => {
            if (url === 'embedded' && connection instanceof EmbeddedAgentService) {
                return {
                    url,
                    status: connection.isInitialized ? 'connected' : 'disconnected',
                    type: 'embedded'
                };
            } else {
                return {
                    url,
                    status: this._getConnectionStatus(connection.readyState),
                    readyState: connection.readyState,
                    type: 'websocket'
                };
            }
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
        if (this.embeddedService) {
            this.embeddedService.removeAllListeners();
            this.embeddedService = null;
        }
        this.removeAllListeners();
    }

    isHealthy() {
        return !this.isDestroyed;
    }
}

export const connectionManager = new ConnectionManager();

export function createConnectionManager(config = {}) {
    return new ConnectionManager(config);
}

export {ConnectionManager};