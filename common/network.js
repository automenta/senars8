// Universal WebSocket that works in both Node.js and browser environments.

/**
 * Creates a universal WebSocket instance.
 * @param {string} url - The WebSocket URL to connect to.
 * @returns {Promise<WebSocket>} A WebSocket instance.
 */
function createWebSocket(url) {
    // Return a promise to handle the asynchronous loading of the ws module in Node.js
    return new Promise((resolve, reject) => {
        // Check if we're in browser environment
        if (typeof window !== 'undefined' && typeof window.WebSocket !== 'undefined') {
            // Browser environment
            try {
                const ws = new window.WebSocket(url);
                // Add error handler for browser WebSocket
                ws.addEventListener('error', (error) => {
                    console.error('Browser WebSocket error:', error);
                });
                resolve(ws);
            } catch (error) {
                reject(error);
            }
        } else {
            // Node.js environment - dynamically import the ws module
            import('ws')
                .then(wsModule => {
                    const WebSocketImpl = wsModule.default;
                    const ws = new WebSocketImpl(url);
                    // Add error handler for Node.js WebSocket
                    ws.on('error', (error) => {
                        console.error('Node.js WebSocket error:', error);
                    });
                    resolve(ws);
                })
                .catch(reject);
        }
    });
}

export {createWebSocket};