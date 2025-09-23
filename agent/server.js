import {WebSocketServer} from 'ws';
import {Agent} from './index.js';
import {debug, info, warn, error as logError} from '@project/core/utils/logger.js';

const wss = new WebSocketServer({port: 8080});

info('Agent WebSocket server started on port 8080');

const agent = new Agent();

// Function to broadcast to all clients
const broadcast = (data) => {
    wss.clients.forEach(client => {
        if (client.readyState === client.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

// Initialize and set up agent event listeners
agent.initialize().then(() => {
    info('Agent initialized');
    broadcast({type: 'agentStatus', payload: 'initialized'});

    const eventBus = agent.system.eventBus;
    if (eventBus) {
        info('Attaching event listeners to EventBus');

        eventBus.on('status_update', (status) => {
            broadcast({type: 'status_update', payload: status});
        });

        eventBus.on('system_cycle', (cycleCount) => {
            broadcast({type: 'system_cycle', payload: {cycleCount}});
        });

        eventBus.on('add_belief', (belief) => {
            // Assuming belief has a serializable representation
            broadcast({type: 'add_belief', payload: belief.toString()});
        });

        eventBus.on('reasoning_step', (step) => {
            // Assuming the step object is serializable or has a useful string representation
            broadcast({type: 'reasoning_step', payload: step});
        });

    } else {
        warn('Agent event bus not available. UI will not receive real-time updates.');
    }

    return true; // Return a value to satisfy the eslint rule
}).catch(error => {
    logError('Agent initialization failed:', error);
    broadcast({type: 'agentStatus', payload: 'initialization_failed'});
    return false; // Return a value to satisfy the eslint rule
});


wss.on('connection', (ws) => {
    info('A new client connected');
    ws.send(JSON.stringify({type: 'connection_ack', payload: {message: 'Welcome!'}}));
    ws.send(JSON.stringify({type: 'agentStatus', payload: agent.isInitialized ? 'initialized' : 'initializing'}));

    ws.on('error', (error) => logError('WebSocket error:', error));

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            await handleMessage(message, ws);
        } catch (error) {
            logError('Failed to handle message:', error);
            ws.send(JSON.stringify({type: 'error', payload: {message: 'Invalid message format or handler error.'}}));
        }
    });

    ws.on('close', () => {
        info('Client disconnected');
    });
});

async function handleMessage(message, ws) {
    const {type, payload} = message;
    debug(`received: ${type}`, payload);

    switch (type) {
        case 'narsese': {
            // This is a simplified interaction. A real implementation would involve
            // converting natural language to Narsese or handling commands.
            const narseseInput = payload;
            broadcast({type: 'log', payload: {source: 'user', message: narseseInput}});

            // For the sketch, we'll treat input as a goal for the planner.
            const plan = await agent.createPlan(narseseInput);

            if (plan && plan.steps.length > 0) {
                const planSteps = plan.steps.map(s => s.toString());
                broadcast({type: 'planCreated', payload: {goal: narseseInput, plan: planSteps}});
                broadcast({
                    type: 'log',
                    payload: {source: 'agent', message: `Plan created for "${narseseInput}": ${planSteps.join(' -> ')}`}
                });
            } else {
                broadcast({
                    type: 'log',
                    payload: {source: 'agent', message: `Could not create a plan for "${narseseInput}".`}
                });
            }
            break;
        }

        case 'agentControl': {
            switch (payload.command) {
                case 'start':
                    // Placeholder for starting the agent's continuous cycle
                    agent.system.start(); // Assuming this method exists
                    broadcast({type: 'log', payload: {source: 'system', message: 'Agent cycling started.'}});
                    break;
                case 'stop':
                    // Placeholder for stopping the agent's continuous cycle
                    agent.system.stop(); // Assuming this method exists
                    broadcast({type: 'log', payload: {source: 'system', message: 'Agent cycling stopped.'}});
                    break;
                case 'reset':
                    // Placeholder for resetting the agent's state
                    await agent.initialize(); // Re-initialize
                    broadcast({type: 'log', payload: {source: 'system', message: 'Agent reset.'}});
                    break;
            }
            break;
        }

        default:
            ws.send(JSON.stringify({type: 'error', payload: {message: `Unknown message type: ${type}`}}));
    }
}