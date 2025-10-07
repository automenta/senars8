/**
 * Message Handler for CoreAgent system
 * Provides message handling capabilities using the coreagent architecture
 */

// System import removed - not currently used
import logger from '../coreagent/utils/logger.js';

const log = logger.create('MessageHandler');

/**
 * Create a message handler that integrates with CoreAgent system
 */
export function createMessageHandler(coreagentSystem, options = {}) {
    return {
        system: coreagentSystem,
        options,

        /**
         * Handle incoming message
         */
        async handleMessage(message, _clientInfo = {}) {
            try {
                log.debug('Handling message:', message);

                // Use coreagent's message system
                if (typeof message === 'string') {
                    message = JSON.parse(message);
                }

                // Route message based on type
                switch (message.type) {
                    case 'task':
                        return await this._handleTask(message);
                    case 'query':
                        return await this._handleQuery(message);
                    case 'command':
                        return await this._handleCommand(message);
                    default:
                        return await this._handleGenericMessage(message);
                }
            } catch (error) {
                log.error('Error handling message:', error);
                return {error: error.message};
            }
        },

        /**
         * Handle task messages
         */
        async _handleTask(message) {
            const {content, priority = 0.5} = message;

            // Create task using coreagent utilities
            const {createTask} = await import('../coreagent/utils.js');
            const task = createTask({
                type: 'belief',
                priority,
                content
            });

            // Add to coreagent memory
            this.system.core.memory._addTask(task);

            return {success: true, taskId: task.id};
        },

        /**
         * Handle query messages
         */
        async _handleQuery(message) {
            const {content} = message;

            // Use coreagent reasoning for queries
            const result = await this.system.core.reasoning._processTask({
                task: {type: 'question', content},
                beliefs: []
            });

            return {success: true, result};
        },

        /**
         * Handle command messages
         */
        async _handleCommand(message) {
            const {command, data} = message;

            // Use coreagent's request system
            const result = await this.system.request(command, data);

            return {success: true, result};
        },

        /**
         * Handle generic messages
         */
        async _handleGenericMessage(message) {
            // Emit through coreagent's event system
            await this.system.emit('message:received', message);

            return {success: true, message: 'Message processed'};
        },

        /**
         * Send response to client
         */
        sendResponse(client, response) {
            if (client && client.readyState === 1) {
                client.send(JSON.stringify(response));
            }
        }
    };
}

/**
 * Create a WebSocket message handler
 */
export function createWebSocketMessageHandler(coreagentSystem, options = {}) {
    const handler = createMessageHandler(coreagentSystem, options);

    return {
        ...handler,

        /**
         * Handle WebSocket connection
         */
        async handleConnection(ws, request) {
            log.info('WebSocket client connected');

            // Set up message handling for this connection
            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    const response = await handler.handleMessage(message, {ws, request});
                    handler.sendResponse(ws, response);
                } catch (error) {
                    log.error('WebSocket message error:', error);
                    handler.sendResponse(ws, {error: error.message});
                }
            });

            ws.on('close', () => {
                log.info('WebSocket client disconnected');
            });

            // Send welcome message
            handler.sendResponse(ws, {
                type: 'welcome',
                message: 'Connected to CoreAgent system'
            });
        }
    };
}