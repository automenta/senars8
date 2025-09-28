/**
 * Creates a universal WebSocket instance.
 * @param {string} url - The WebSocket URL to connect to.
 * @returns {WebSocket} A WebSocket instance.
 */
function createWebSocket(url) {
    // Universal WebSocket that works in both Node.js and browser environments.
    const WebSocket = typeof window !== 'undefined' ? window.WebSocket : (typeof require !== 'undefined' ? require('ws') : null);
    
    if (!WebSocket) {
        throw new Error('WebSocket is not available in this environment');
    }
    
    const ws = new WebSocket(url);
    // A basic error handler is included as a fallback.
    // The consumer can and should attach a more specific error handler.
    if (ws.on) {
        ws.on('error', (error) => {
            console.error('WebSocket creation/connection error:', error.message);
        });
    }
    return ws;
}

export {createWebSocket};