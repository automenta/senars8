import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { debug, error as logError, warn, info } from '../../core/utils/logger.js';
import WebUIAPI from './WebUIAPI.js';
import WebSocketHandler from './WebSocketHandler.js';
import UIConfig from './config/UIConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WebUI {
    constructor(agent, options = {}) {
        this.config = new UIConfig(options);
        this.agent = agent;
        this.port = this.config.get('webui.port', 3000);
        this.host = this.config.get('webui.host', 'localhost');
        this.app = express();
        this.server = null;
        this.wss = null;
        this.isRunning = false;
        
        // Initialize API and WebSocket handler
        this.api = new WebUIAPI(agent);
        this.wsHandler = null;
        
        this.setupExpressApp();
    }

    setupExpressApp() {
        // Serve static files from configured path
        const staticPath = this.config.get('webui.staticPath', '../public');
        this.app.use(express.static(path.join(__dirname, staticPath)));
        
        // Parse JSON bodies
        this.app.use(express.json());
        
        // Serve main HTML page
        this.app.get('/', (req, res) => {
            const staticPath = this.config.get('webui.staticPath', '../public');
            res.sendFile(path.join(__dirname, staticPath, 'index.html'));
        });
        
        // API endpoints
        this.setupAPIRoutes();
    }

    setupAPIRoutes() {
        // Get system status
        this.app.get('/api/status', (req, res) => {
            try {
                res.json(this.api.getStatus());
            } catch (error) {
                logError('Error getting status:', error);
                res.status(500).json({ error: error.message });
            }
        });
        
        // Get tasks
        this.app.get('/api/tasks', (req, res) => {
            try {
                res.json(this.api.getTasks());
            } catch (error) {
                logError('Error getting tasks:', error);
                res.status(500).json({ error: error.message });
            }
        });
        
        // Get memory state
        this.app.get('/api/memory', (req, res) => {
            try {
                res.json(this.api.getMemoryState());
            } catch (error) {
                logError('Error getting memory state:', error);
                res.status(500).json({ error: error.message });
            }
        });
        
        // Add a new task
        this.app.post('/api/tasks', express.json(), async (req, res) => {
            try {
                const { content, type } = req.body;
                const result = await this.api.addTask(content, type);
                res.json(result);
                
                // Broadcast state update
                this.broadcastStateUpdate();
            } catch (error) {
                logError('Error adding task via API:', error);
                res.status(500).json({ error: error.message });
            }
        });
        
        // Add a new belief
        this.app.post('/api/beliefs', express.json(), async (req, res) => {
            try {
                const { content } = req.body;
                const result = await this.api.addBelief(content);
                res.json(result);
                
                // Broadcast state update
                this.broadcastStateUpdate();
            } catch (error) {
                logError('Error adding belief via API:', error);
                res.status(500).json({ error: error.message });
            }
        });
        
        // Add a new goal
        this.app.post('/api/goals', express.json(), async (req, res) => {
            try {
                const { content } = req.body;
                const result = await this.api.addGoal(content);
                res.json(result);
                
                // Broadcast state update
                this.broadcastStateUpdate();
            } catch (error) {
                logError('Error adding goal via API:', error);
                res.status(500).json({ error: error.message });
            }
        });
        
        // Add a new question
        this.app.post('/api/questions', express.json(), async (req, res) => {
            try {
                const { content } = req.body;
                const result = await this.api.addQuestion(content);
                res.json(result);
                
                // Broadcast state update
                this.broadcastStateUpdate();
            } catch (error) {
                logError('Error adding question via API:', error);
                res.status(500).json({ error: error.message });
            }
        });
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
            
            // Start server with host and port from config
            this.server.listen(this.port, this.host, () => {
                console.log(`WebUI server running on http://${this.host}:${this.port}`);
                this.isRunning = true;
                resolve();
            });

            // Setup WebSocket server with configuration
            const maxClients = this.config.get('webui.maxWebSocketClients', 100);
            this.wss = new WebSocketServer({ 
                server: this.server,
                handleProtocols: (protocols, request) => {
                    // Limit number of clients if needed
                    if (this.wss.clients.size >= maxClients) {
                        return false; // Reject connection
                    }
                    return true;
                }
            });
            
            // Initialize WebSocket handler with broadcast callback
            this.wsHandler = new WebSocketHandler(this.agent, this.api, () => this.broadcastStateUpdate());
            
            this.wss.on('connection', (ws) => {
                info('New WebSocket client connected');
                
                // Check client limit
                if (this.wss.clients.size > maxClients) {
                    warn(`Client limit reached (${maxClients}), rejecting connection`);
                    ws.close(1013, 'Client limit reached'); // Try again later status
                    return;
                }
                
                // Send initial state
                this.wsHandler.sendStateUpdate(ws);
                
                // Listen for messages
                ws.on('message', (message) => {
                    try {
                        const data = JSON.parse(message);
                        this.wsHandler.handleMessage(ws, data);
                    } catch (error) {
                        logError('Error parsing WebSocket message:', error);
                        console.error('Error parsing WebSocket message:', error);
                    }
                });
                
                // Handle disconnection
                ws.on('close', () => {
                    info('WebSocket client disconnected');
                });
            });

            // Listen for system events to broadcast updates
            const system = this.agent?.system;
            if (system?.eventBus) {
                system.eventBus.on('system.state.changed', () => {
                    info('System state changed, broadcasting update');
                    this.broadcastStateUpdate();
                });
                
                system.eventBus.on('tasks.add', (tasks) => {
                    info(`Tasks added (${tasks.length}), broadcasting update`);
                    this.broadcastStateUpdate();
                });
                
                system.eventBus.on('memory.update', () => {
                    info('Memory updated, broadcasting update');
                    this.broadcastStateUpdate();
                });
            }
        });
    }

    broadcastStateUpdate() {
        if (!this.wss) return;
        
        const state = this.wsHandler.getInitialState();
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