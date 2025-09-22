import { WebSocketServer } from 'ws';
import { Agent } from './services/index.js';

const wss = new WebSocketServer({ port: 8080 });

console.log('Agent WebSocket server started on port 8080');

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
    console.log('Agent initialized');
    broadcast({ type: 'agentStatus', payload: 'initialized' });

    // Example of hooking into an agent event
    // This requires an event emitter on the agent/system, which we assume for this sketch
    // For example, if the EventBus is accessible:
    agent.system.eventBus?.on('cycle', (cycleCount) => {
        broadcast({ type: 'systemCycle', payload: { cycleCount } });
    });
}).catch(error => {
    console.error('Agent initialization failed:', error);
    broadcast({ type: 'agentStatus', payload: 'initialization_failed' });
});


wss.on('connection', (ws) => {
    console.log('A new client connected');
    ws.send(JSON.stringify({ type: 'connection_ack', payload: { message: 'Welcome!' } }));
    ws.send(JSON.stringify({ type: 'agentStatus', payload: agent.isInitialized ? 'initialized' : 'initializing' }));

    ws.on('error', console.error);

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            await handleMessage(message, ws);
        } catch (error) {
            console.error('Failed to handle message:', error);
            ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message format or handler error.' } }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

async function handleMessage(message, ws) {
    const { type, payload } = message;
    console.log(`received: ${type}`, payload);

    switch (type) {
        case 'userInput': {
            // This is a simplified interaction. A real implementation would involve
            // converting natural language to Narsese or handling commands.
            const goal = payload.text;
            broadcast({ type: 'log', payload: { source: 'user', message: goal } });
            
            // For the sketch, we'll treat input as a goal for the planner.
            const plan = await agent.createPlan(goal);
            
            if (plan && plan.steps.length > 0) {
                const planSteps = plan.steps.map(s => s.toString());
                broadcast({ type: 'planCreated', payload: { goal, plan: planSteps } });
                broadcast({ type: 'log', payload: { source: 'agent', message: `Plan created for "${goal}": ${planSteps.join(' -> ')}` } });
            } else {
                broadcast({ type: 'log', payload: { source: 'agent', message: `Could not create a plan for "${goal}".` } });
            }
            break;
        }
        
        case 'agentControl': {
            switch(payload.command) {
                case 'start':
                    // Placeholder for starting the agent's continuous cycle
                    agent.system.start(); // Assuming this method exists
                    broadcast({ type: 'log', payload: { source: 'system', message: 'Agent cycling started.' } });
                    break;
                case 'stop':
                    // Placeholder for stopping the agent's continuous cycle
                    agent.system.stop(); // Assuming this method exists
                    broadcast({ type: 'log', payload: { source: 'system', message: 'Agent cycling stopped.' } });
                    break;
                case 'reset':
                    // Placeholder for resetting the agent's state
                    await agent.initialize(); // Re-initialize
                    broadcast({ type: 'log', payload: { source: 'system', message: 'Agent reset.' } });
                    break;
            }
            break;
        }

        default:
            ws.send(JSON.stringify({ type: 'error', payload: { message: `Unknown message type: ${type}` } }));
    }
}