/**
 * @file Manages WebSocket connections to agent processes, supporting both single and multi-agent setups.
 * This module provides a centralized way for UI components (TUI and Web UI) to discover, connect to,
 * and interact with running agent instances.
 */

import WebSocket from 'ws';
import {EventEmitter} from 'events';
import logger from '../../core/utils/logger.js';

const log = logger.create('ConnectionManager');

class ConnectionManager extends EventEmitter {
    constructor() {
        super();
        this.connections = new Map();
    }

    /**
     * Discovers and connects to available agent WebSocket servers.
     * Uses retry logic to handle cases where the agent isn't immediately available.
     * @param {number} port - Optional port to connect to, defaults to WS_PORT env var or 8081
     */
    async discover(port) {
        const defaultPort = port || parseInt(process.env.WS_PORT, 10) || 8081; // Default to 8081 to match scripts
        const maxRetries = 3; // Further reduced retries for faster feedback
        const baseDelay = 200; // Start with 0.2 second delay

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const wsUrl = `ws://localhost:${defaultPort}`;
                log.info(`Attempting to connect to agent at ${wsUrl} (attempt ${attempt}/${maxRetries})`);

                const ws = this.connect(wsUrl);

                // Wait for connection to be established or fail
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Connection timeout'));
                    }, 1500); // Further reduced timeout for faster feedback

                    ws.on('open', () => {
                        clearTimeout(timeout);
                        resolve();
                    });

                    ws.on('error', (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    });
                });

                log.info(`Successfully connected to agent at ${wsUrl}`);
                return; // Success, exit the retry loop

            } catch (error) {
                log.warn(`Connection attempt ${attempt} failed:`, error.message);

                if (attempt === maxRetries) {
                    log.error(`Failed to connect after ${maxRetries} attempts`);
                    // Emit error but don't throw - allow graceful handling
                    this.emit('error', {url: `ws://localhost:${defaultPort}`, error: new Error('Max retries exceeded')});
                    return;
                }

                // Exponential backoff delay
                const delay = baseDelay * Math.pow(2, attempt - 1);
                log.info(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Connects to a specific WebSocket URL.
     * @param {string} url - The WebSocket URL of the agent.
     */
    connect(url) {
        if (this.connections.has(url)) {
            return this.connections.get(url);
        }

        const ws = new WebSocket(url);

        ws.on('open', () => {
            this.connections.set(url, ws);
            this.emit('connection', {url, status: 'connected'});
            this.emit('update');
        });

        ws.on('message', (data) => {
            this.emit('message', {url, data: data.toString()});
        });

        ws.on('close', () => {
            this.connections.delete(url);
            this.emit('disconnection', {url, status: 'disconnected'});
            this.emit('update');
        });

        ws.on('error', (error) => {
            this.emit('error', {url, error});
            // The 'close' event will be fired after 'error', so no need to clean up here.
        });

        return ws;
    }

    /**
     * Sends a message to a specific connection.
     * @param {string} url - The URL of the connection.
     * @param {any} data - The data to send.
     */
    send(url, data) {
        const connection = this.connections.get(url);
        if (connection && connection.readyState === WebSocket.OPEN) {
            connection.send(JSON.stringify(data));
        }
    }

    /**
     * Closes a specific connection.
     * @param {string} url - The URL of the connection to close.
     */
    disconnect(url) {
        const connection = this.connections.get(url);
        if (connection) {
            connection.close();
        }
    }

    /**
     * Closes all active connections.
     */
    disconnectAll() {
        for (const url of this.connections.keys()) {
            this.disconnect(url);
        }
    }

    /**
     * Returns a list of active connections.
     * @returns {Array<{url: string, status: string}>}
     */
    getConnections() {
        return Array.from(this.connections.keys()).map(url => ({
            url,
            status: this.connections.get(url).readyState === WebSocket.OPEN ? 'connected' : 'connecting',
        }));
    }
}

export const connectionManager = new ConnectionManager();