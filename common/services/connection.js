/**
 * @file Manages WebSocket connections to agent processes, supporting both single and multi-agent setups.
 * This module provides a centralized way for UI components (TUI and Web UI) to discover, connect to,
 * and interact with running agent instances.
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';

class ConnectionManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
  }

  /**
   * Discovers and connects to available agent WebSocket servers.
   * For now, this will be a placeholder. In the future, this could involve scanning ports
   * or reading from a service discovery mechanism.
   */
  async discover() {
    // Placeholder for discovery logic
    // For now, we'll assume a single agent running on a known port
    const defaultPort = process.env.WS_PORT || 8080;
    this.connect(`ws://localhost:${defaultPort}`);
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
      this.emit('connection', { url, status: 'connected' });
      this.emit('update');
    });

    ws.on('message', (data) => {
      this.emit('message', { url, data: data.toString() });
    });

    ws.on('close', () => {
      this.connections.delete(url);
      this.emit('disconnection', { url, status: 'disconnected' });
      this.emit('update');
    });

    ws.on('error', (error) => {
      this.emit('error', { url, error });
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