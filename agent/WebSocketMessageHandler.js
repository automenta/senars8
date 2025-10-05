import logger from '../core/utils/logger.js';

const log = logger.create('WebSocketMessageHandler');

/**
 * Unified WebSocket message handler that consolidates common message processing logic.
 * Eliminates duplication between WebSocketManager and StandaloneWebSocketServer.
 */
export class WebSocketMessageHandler {
    constructor() {
        this.messageHandler = null;
    }

    setHandler(handler) {
        this.messageHandler = handler;
    }

    async handleMessage(data, ws) {
        if (!this.messageHandler) return;

        const {executeAsync} = await import('./utils/asyncWrapper.js');

        await executeAsync(async () => {
            let message;
            try {
                message = JSON.parse(data, (key, value) => {
                    // Convert string representations of large numbers back to numbers
                    if (typeof value === 'string' && /^\d+$/.test(value) && value.length > 15) {
                        // This might be a large number that was converted to string to preserve precision
                        // Check if it fits in a safe integer, otherwise potentially convert to BigInt
                        const numValue = Number(value);
                        if (Number.isSafeInteger(numValue)) {
                            return numValue;
                        } else {
                            // For unsafe integers, we can preserve as BigInt for internal processing
                            try {
                                return BigInt(value);
                            } catch (e) {
                                return value; // Keep as string if BigInt conversion fails
                            }
                        }
                    }
                    return value;
                });
            } catch (parseError) {
                log.error('Error parsing WebSocket message:', parseError);
                // Send error response to client
                ws.send(JSON.stringify({
                    type: 'error',
                    payload: {message: 'Invalid JSON received: ' + parseError.message}
                }));
                return;
            }
            await this.messageHandler(message, ws);
        }, ws, 'handle message');
    }
}