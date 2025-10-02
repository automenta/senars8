import AgentManager from './AgentManager.js';
import {startWebSocketServer} from './WebSocketServer.js';
import {createMessageHandler} from './MessageHandler.js';
import {error} from '../core/utils/logger.js';

const PORT = 8080;

const {broadcast, setMessageHandler} = startWebSocketServer(PORT);
const agentManager = new AgentManager(broadcast);

const messageHandler = createMessageHandler(agentManager, broadcast);
setMessageHandler(messageHandler);

agentManager.initialize().catch(err => {
    error('Failed to initialize AgentManager:', err);
});