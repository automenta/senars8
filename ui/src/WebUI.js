import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WebUI {
    constructor(agent, options = {}) {
        this.agent = agent;
        this.port = options.port || 3000;
        this.app = express();
        this.server = null;
        this.wss = null;
        this.isRunning = false;
        
        this.setupExpressApp();
    }

    setupExpressApp() {
        // Serve static files
        this.app.use(express.static(path.join(__dirname, '../public')));
        
        // Serve main HTML page
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/index.html'));
        });
        
        // API endpoints
        this.setupAPIRoutes();
    }

    setupAPIRoutes() {
        // Get system status
        this.app.get('/api/status', (req, res) => {
            const system = this.agent?.system;
            res.json({
                isRunning: system?.isRunning || false,
                cycleCount: system?.cycleCount || 0,
                timestamp: new Date().toISOString()
            });
        });
        
        // Get tasks
        this.app.get('/api/tasks', (req, res) => {
            const tasks = this.getTasks();
            res.json(tasks);
        });
        
        // Get memory state
        this.app.get('/api/memory', (req, res) => {
            const memory = this.getMemoryState();
            res.json(memory);
        });
        
        // Add a new task
        this.app.post('/api/tasks', express.json(), (req, res) => {
            const { content, type } = req.body;
            if (content && this.agent) {
                // For now we'll return a success response
                // In a real implementation, we would create and add the task to the agent
                res.json({ success: true, message: 'Task added (placeholder)' });
            } else {
                res.status(400).json({ error: 'Content is required' });
            }
        });
    }

    getTasks() {
        if (this.agent?.getAllTasks) {
            return this.agent.getAllTasks() || [];
        }
        return [];
    }

    getMemoryState() {
        return {
            beliefs: this.getBeliefs(),
            goals: this.getGoals(),
            questions: this.getQuestions()
        };
    }

    getBeliefs() {
        if (this.agent?.getBeliefs) {
            return this.agent.getBeliefs() || [];
        }
        return [];
    }

    getGoals() {
        if (this.agent?.getGoals) {
            return this.agent.getGoals() || [];
        }
        return [];
    }

    getQuestions() {
        if (this.agent?.getQuestions) {
            return this.agent.getQuestions() || [];
        }
        return [];
    }

    start() {
        return new Promise((resolve, reject) => {
            if (this.isRunning) {
                console.log('WebUI is already running');
                resolve();
                return;
            }

            // Create HTTP server
            this.server = createServer(this.app);
            
            // Start server
            this.server.listen(this.port, () => {
                console.log(`WebUI server running on http://localhost:${this.port}`);
                this.isRunning = true;
                resolve();
            });

            // Setup WebSocket server
            this.wss = new WebSocketServer({ server: this.server });
            
            this.wss.on('connection', (ws) => {
                console.log('New client connected');
                
                // Send initial state
                ws.send(JSON.stringify({
                    type: 'initialState',
                    payload: this.getInitialState()
                }));
                
                // Listen for messages
                ws.on('message', (message) => {
                    try {
                        const data = JSON.parse(message);
                        this.handleWebSocketMessage(ws, data);
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                });
                
                // Handle disconnection
                ws.on('close', () => {
                    console.log('Client disconnected');
                });
            });

            // Listen for system events to broadcast updates
            const system = this.agent?.system;
            if (system?.eventBus) {
                system.eventBus.on('system.state.changed', () => {
                    this.broadcastStateUpdate();
                });
                
                system.eventBus.on('tasks.add', () => {
                    this.broadcastStateUpdate();
                });
                
                system.eventBus.on('memory.update', () => {
                    this.broadcastStateUpdate();
                });
            }
        });
    }

    getInitialState() {
        const system = this.agent?.system;
        return {
            status: {
                isRunning: system?.isRunning || false,
                cycleCount: system?.cycleCount || 0
            },
            tasks: this.getTasks(),
            memory: this.getMemoryState()
        };
    }

    handleWebSocketMessage(ws, data) {
        switch (data.type) {
            case 'requestState':
                ws.send(JSON.stringify({
                    type: 'stateUpdate',
                    payload: this.getInitialState()
                }));
                break;
            case 'systemControl':
                this.handleSystemControl(data.payload, ws);
                break;
            case 'addTask':
                this.handleAddTask(data.payload, ws);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    handleSystemControl(payload, ws) {
        const { action } = payload;
        
        switch (action) {
            case 'start':
                if (this.agent) {
                    this.agent.start(); // Start the agent
                    ws.send(JSON.stringify({
                        type: 'systemControlResponse',
                        payload: { success: true, action: 'start', message: 'Agent started' }
                    }));
                }
                break;
            case 'stop':
                if (this.agent) {
                    this.agent.stop(); // Stop the agent
                    ws.send(JSON.stringify({
                        type: 'systemControlResponse',
                        payload: { success: true, action: 'stop', message: 'Agent stopped' }
                    }));
                }
                break;
            default:
                ws.send(JSON.stringify({
                    type: 'systemControlResponse',
                    payload: { success: false, error: 'Unknown action' }
                }));
        }
    }

    handleAddTask(payload, ws) {
        const { content, type } = payload;
        if (content && this.agent) {
            // For now we'll just send a success response
            // In a real implementation, we would create and add the task to the agent
            ws.send(JSON.stringify({
                type: 'addTaskResponse',
                payload: { success: true, message: 'Task added (placeholder)' }
            }));
        } else {
            ws.send(JSON.stringify({
                type: 'addTaskResponse',
                payload: { success: false, error: 'Content is required' }
            }));
        }
    }

    broadcastStateUpdate() {
        if (!this.wss) return;
        
        const state = this.getInitialState();
        const message = JSON.stringify({
            type: 'stateUpdate',
            payload: state
        });
        
        this.wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.send(message);
            }
        });
    }

    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }
        
        if (this.server) {
            this.server.close(() => {
                console.log('WebUI server stopped');
            });
        }
    }
}

export default WebUI;