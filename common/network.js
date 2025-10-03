// Universal WebSocket that works in both Node.js and browser environments.

/**
 * Creates a universal WebSocket instance.
 * @param {string} url - The WebSocket URL to connect to.
 * @returns {Promise<WebSocket>} A WebSocket instance.
 */
async function createWebSocket(url) {
    // Determine environment and create appropriate WebSocket instance
    if (typeof window !== 'undefined' && window.WebSocket) {
        // Browser environment
        const ws = new window.WebSocket(url);
        ws.onerror = (error) => {
            console.error('Browser WebSocket error:', error);
        };
        return ws;
    } else {
        // Node.js environment
        const { default: WS } = await import('ws');
        const ws = new WS(url);
        ws.on('error', (error) => {
            console.error('Node.js WebSocket error:', error);
        });
        return ws;
    }
}

export {createWebSocket};