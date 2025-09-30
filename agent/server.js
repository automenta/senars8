import { Agent } from './index.js';
import { startWebSocketServer } from './WebSocketServer.js';
import { createMessageHandler } from './MessageHandler.js';
import { initializeLogger, serverInfo, serverError, serverWarn } from './utils/logger.js';
import { formatTaskForBroadcast } from './utils/taskUtils.js';

const PORT = 8080;

const agent = new Agent();

// Start the WebSocket server
const { broadcast, setMessageHandler } = startWebSocketServer(PORT);

// Initialize the logger with the broadcast function
initializeLogger(broadcast);

// Create a message handler and set it on the WebSocket server
const messageHandler = createMessageHandler(agent, broadcast);
setMessageHandler(messageHandler);

// Initialize and set up agent event listeners
agent.initialize().then(() => {
    serverInfo('Agent initialized');
    broadcast({ type: 'agentStatus', payload: 'initialized' });

    const eventBus = agent.system.eventBus;
    if (eventBus) {
        serverInfo('Attaching event listeners to EventBus');

        eventBus.on('status_update', (status) => {
            broadcast({ type: 'status_update', payload: status });
        });

        eventBus.on('system_cycle', (cycleCount) => {
            broadcast({ type: 'system_cycle', payload: { cycleCount } });
        });

        eventBus.on('add_belief', (belief) => {
            broadcast({ type: 'add_belief', payload: formatTaskForBroadcast(belief) });
        });

        eventBus.on('add_goal', (goal) => {
            broadcast({ type: 'add_goal', payload: formatTaskForBroadcast(goal) });
        });

        eventBus.on('add_question', (question) => {
            broadcast({ type: 'add_question', payload: formatTaskForBroadcast(question) });
        });

        eventBus.on('add_task', (task) => {
            broadcast({ type: 'task_added', payload: formatTaskForBroadcast(task) });
        });

        eventBus.on('reasoning_step', (step) => {
            broadcast({ type: 'reasoning_step', payload: step });
        });

        eventBus.on('memory_changed', (changes) => {
            broadcast({ type: 'memory_update', payload: changes });
        });

    } else {
        serverWarn('Agent event bus not available. UI will not receive real-time updates.');
    }

    return true;
}).catch(err => {
    serverError('Agent initialization failed:', err);
    broadcast({ type: 'agentStatus', payload: 'initialization_failed' });
    return false;
});