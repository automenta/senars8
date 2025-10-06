/**
 * WebSocket abstraction that works in both browser and Node.js environments
 * This handles the environment-specific WebSocket implementation
 */

export class UniversalWebSocket {
  /**
   * Get the appropriate WebSocket implementation based on environment
   */
  static getImplementation() {
    if (typeof window !== 'undefined' && window.WebSocket) {
      // Browser environment
      return window.WebSocket;
    } else {
      // Node.js environment
      const { default: ws } = require('ws');
      return ws;
    }
  }

  /**
   * Create a WebSocket instance appropriate for the current environment
   */
  static create(url, options = {}) {
    const WsImpl = this.getImplementation();
    return new WsImpl(url, options);
  }

  /**
   * Check if we're in a browser environment
   */
  static isBrowser() {
    return typeof window !== 'undefined' && typeof window.WebSocket !== 'undefined';
  }

  /**
   * Check if we're in a Node.js environment
   */
  static isNode() {
    return typeof process !== 'undefined' && process.versions && process.versions.node;
  }
}

export default UniversalWebSocket;