import WebSocket from 'ws';

/**
 * Creates a WebSocket client with message buffering and listener capabilities.
 * @param {string} url - The WebSocket URL to connect to.
 * @param {number} timeout - Connection timeout in milliseconds.
 * @returns {Promise<WebSocket>} A promise that resolves with the enhanced WebSocket instance.
 */
export function createWebSocketClient(url, timeout = 2000) {
    const ws = new WebSocket(url);
    ws.messageBuffer = [];
    ws.messageListeners = [];

    ws.on('message', (data) => {
        const message = JSON.parse(data);

        // Check if any listener is waiting for this message
        const listenerIndex = ws.messageListeners.findIndex(listener => listener.filter(message));

        if (listenerIndex > -1) {
            // If a listener is found, resolve its promise and remove it
            const [listener] = ws.messageListeners.splice(listenerIndex, 1);
            listener.resolve(message);
        } else {
            // Otherwise, add the message to the buffer
            ws.messageBuffer.push(message);
        }
    });

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            ws.close();
            reject(new Error(`WebSocket connection to ${url} timed out after ${timeout}ms`));
        }, timeout);

        ws.on('open', () => {
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
 * Awaits the next message from a WebSocket client that matches a filter.
 * Checks a buffer of received messages before waiting for a new one.
 * @param {WebSocket} ws - The WebSocket client.
 * @param {Function} [filter=() => true] - A function to filter messages.
 * @param {number} [timeout=2000] - Timeout in milliseconds.
 * @returns {Promise<any>} A promise that resolves with the parsed message data.
 */
export function awaitNextMessage(ws, filter = () => true, timeout = 2000) {
    // First, check the buffer for a matching message
    const bufferedIndex = ws.messageBuffer.findIndex(filter);
    if (bufferedIndex > -1) {
        const [message] = ws.messageBuffer.splice(bufferedIndex, 1);
        return Promise.resolve(message);
    }

    // If no matching message is in the buffer, set up a listener
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            // On timeout, remove the listener and reject the promise
            const index = ws.messageListeners.indexOf(listener);
            if (index > -1) {
                ws.messageListeners.splice(index, 1);
            }
            reject(new Error(`Did not receive a message within ${timeout}ms`));
        }, timeout);

        const listener = {
            filter,
            resolve: (message) => {
                clearTimeout(timer);
                resolve(message);
            },
        };

        ws.messageListeners.push(listener);
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