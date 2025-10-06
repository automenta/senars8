export const createWebSocket = (url) =>
    new Promise((resolve, reject) => {
        if (typeof window !== 'undefined' && window.WebSocket) {
            try {
                const ws = new window.WebSocket(url);
                ws.addEventListener('error', (error) => console.error('Browser WebSocket error:', error));
                resolve(ws);
            } catch (error) {
                reject(error);
            }
        } else {
            import('ws').then(({default: WebSocketImpl}) => {
                const ws = new WebSocketImpl(url);
                ws.on('error', (error) => console.error('Node.js WebSocket error:', error));
                resolve(ws);
            }).catch(reject);
        }
    });