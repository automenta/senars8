import {error as logError, info, warn} from '../../common/services/Logger.js';

/**
 * WebSocket message handler for the WebUI
 */
class WebSocketHandler {
    constructor(agent, api, broadcastCallback) {
        this.agent = agent;
        this.api = api;
        this.broadcastCallback = broadcastCallback;
    }

    /**
     * Handle incoming WebSocket messages
     */
    async handleMessage(ws, data) {
        try {
            switch (data.type) {
                case 'requestState':
                    this.sendStateUpdate(ws);
                    break;
                case 'systemControl':
                    await this.handleSystemControl(data.payload, ws);
                    break;
                case 'addTask':
                    await this.handleAddTask(data.payload, ws);
                    break;
                case 'addBelief':
                    await this.handleAddBelief(data.payload, ws);
                    break;
                case 'addGoal':
                    await this.handleAddGoal(data.payload, ws);
                    break;
                case 'addQuestion':
                    await this.handleAddQuestion(data.payload, ws);
                    break;
                default:
                    warn(`Unknown WebSocket message type: ${data.type}`);
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            logError('Error handling WebSocket message:', error);
            this.sendErrorResponse(ws, 'Error processing message', data.type);
        }
    }

    /**
     * Send state update to a specific client
     */
    sendStateUpdate(ws) {
        const state = this.getInitialState();
        ws.send(JSON.stringify({
            type: 'stateUpdate',
            payload: state
        }));
    }

    /**
     * Get initial state for the UI
     */
    getInitialState() {
        const system = this.agent?.system;
        return {
            status: {
                isRunning: system?.isRunning || false,
                cycleCount: system?.cycleCount || 0
            },
            tasks: this.api.getTasks(),
            memory: this.api.getMemoryState()
        };
    }

    /**
     * Handle system control commands (start/stop)
     */
    async handleSystemControl(payload, ws) {
        const {action} = payload;

        try {
            switch (action) {
                case 'start':
                    if (this.agent) {
                        this.agent.start(); // Start the agent
                        this.sendResponse(ws, {
                            type: 'systemControlResponse',
                            payload: {success: true, action: 'start', message: 'Agent started'}
                        });
                        info('Agent started via WebSocket');
                    } else {
                        this.sendErrorResponse(ws, 'Agent not available', 'systemControl');
                    }
                    break;
                case 'stop':
                    if (this.agent) {
                        this.agent.stop(); // Stop the agent
                        this.sendResponse(ws, {
                            type: 'systemControlResponse',
                            payload: {success: true, action: 'stop', message: 'Agent stopped'}
                        });
                        info('Agent stopped via WebSocket');
                    } else {
                        this.sendErrorResponse(ws, 'Agent not available', 'systemControl');
                    }
                    break;
                default:
                    this.sendErrorResponse(ws, 'Unknown action', 'systemControl');
            }
        } catch (error) {
            logError('Error in system control:', error);
            this.sendErrorResponse(ws, error.message, 'systemControl');
        }
    }

    /**
     * Handle adding a new task
     */
    async handleAddTask(payload, ws) {
        try {
            const result = await this.api.addTask(payload.content, payload.type);
            this.sendResponse(ws, {
                type: 'addTaskResponse',
                payload: result
            });

            // Broadcast the state update to all clients
            if (this.broadcastCallback) {
                this.broadcastCallback();
            }
        } catch (error) {
            logError('Error adding task:', error);
            this.sendErrorResponse(ws, error.message, 'addTask');
        }
    }

    /**
     * Handle adding a new belief
     */
    async handleAddBelief(payload, ws) {
        try {
            const result = await this.api.addBelief(payload.content);
            this.sendResponse(ws, {
                type: 'addBeliefResponse',
                payload: result
            });

            // Broadcast the state update to all clients
            if (this.broadcastCallback) {
                this.broadcastCallback();
            }
        } catch (error) {
            logError('Error adding belief:', error);
            this.sendErrorResponse(ws, error.message, 'addBelief');
        }
    }

    /**
     * Handle adding a new goal
     */
    async handleAddGoal(payload, ws) {
        try {
            const result = await this.api.addGoal(payload.content);
            this.sendResponse(ws, {
                type: 'addGoalResponse',
                payload: result
            });

            // Broadcast the state update to all clients
            if (this.broadcastCallback) {
                this.broadcastCallback();
            }
        } catch (error) {
            logError('Error adding goal:', error);
            this.sendErrorResponse(ws, error.message, 'addGoal');
        }
    }

    /**
     * Handle adding a new question
     */
    async handleAddQuestion(payload, ws) {
        try {
            const result = await this.api.addQuestion(payload.content);
            this.sendResponse(ws, {
                type: 'addQuestionResponse',
                payload: result
            });

            // Broadcast the state update to all clients
            if (this.broadcastCallback) {
                this.broadcastCallback();
            }
        } catch (error) {
            logError('Error adding question:', error);
            this.sendErrorResponse(ws, error.message, 'addQuestion');
        }
    }

    /**
     * Send a response to a WebSocket client
     */
    sendResponse(ws, message) {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    /**
     * Send an error response to a WebSocket client
     */
    sendErrorResponse(ws, error, originalType) {
        this.sendResponse(ws, {
            type: `${originalType}Response`,
            payload: {success: false, error}
        });
    }
}

export default WebSocketHandler;