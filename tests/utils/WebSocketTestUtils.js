import WebSocket from 'ws';

/**
 * Creates a WebSocket client and returns a promise that resolves when the connection is open.
 * @param {string} url - The WebSocket URL to connect to.
 * @param {number} timeout - Connection timeout in milliseconds.
 * @returns {Promise<WebSocket>} A promise that resolves with the WebSocket instance.
 */
export function createWebSocketClient(url, timeout = 2000) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        const timer = setTimeout(() => {
            ws.close();
            reject(new Error(`WebSocket connection to ${url} timed out after ${timeout}ms`));
        }, timeout);

        ws.on('open', () => {
            // The connection is open, but we need to handle any immediate messages
            // that might be sent by the server right after connection
            clearTimeout(timer);
            resolve(ws);
        });

        ws.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

/**
 * Awaits the next message from a WebSocket client.
 * @param {WebSocket} ws - The WebSocket client.
 * @param {number} timeout - Timeout in milliseconds.
 * @returns {Promise<any>} A promise that resolves with the parsed message data.
 */
export function awaitNextMessage(ws, timeout = 2000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Did not receive a message within ${timeout}ms`));
        }, timeout);

        ws.once('message', (data) => {
            clearTimeout(timer);
            try {
                resolve(JSON.parse(data));
            } catch (e) {
                resolve(data.toString());
            }
        });
    });
}

/**
 * Gracefully closes a WebSocket connection.
 * @param {WebSocket} ws - The WebSocket client to close.
 */
export function closeWebSocket(ws) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
    }
}