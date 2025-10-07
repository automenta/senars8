/**
 * Vite plugin for agent server functionality
 * Provides Vite integration for CoreAgent system
 */

import {AgentManager} from './AgentManager.js';
import logger from '../coreagent/utils/logger.js';

const log = logger.create('AgentVitePlugin');

/**
 * Create a Vite plugin for agent server functionality
 */
export function agentServerPlugin(options = {}) {
    const {
        port = 8080,
        host = 'localhost',
        agentConfig = {}
    } = options;

    return {
        name: 'agent-server',
        configureServer(server) {
            const agentManager = new AgentManager();

            // Create and start agent when server starts
            server.middlewares.use(async (req, res, next) => {
                if (req.url === '/agent/status') {
                    // Agent status endpoint
                    const statuses = agentManager.getAllAgentStatuses();
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(statuses));
                    return;
                }

                if (req.url === '/agent/create' && req.method === 'POST') {
                    // Create new agent endpoint
                    try {
                        const agentId = await agentManager.createAgent(agentConfig);
                        await agentManager.startAgent(agentId);

                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({success: true, agentId}));
                    } catch (error) {
                        log.error('Error creating agent:', error);
                        res.statusCode = 500;
                        res.end(JSON.stringify({error: error.message}));
                    }
                    return;
                }

                next();
            });

            log.info('Agent server plugin configured for Vite');
        }
    };
}