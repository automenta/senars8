import TuiAgentService from './TuiAgentService.js';

class AgentManager {
    constructor() {
        this.agents = new Map(); // Store multiple agent connections
        this.discoveredAgents = new Map(); // Store discovered agents
    }

    // Singleton instance
    static getInstance() {
        if (!globalThis.agentManagerInstance) {
            globalThis.agentManagerInstance = new AgentManager();
        }
        return globalThis.agentManagerInstance;
    }

    async connect(agentId, url, agentName = `Agent ${agentId}`) {
        // Create a new TuiAgentService instance for this connection
        const apiService = new TuiAgentService(url);
        apiService.initialize(agentId, agentName);

        // Connect to the agent
        apiService.connect();

        // Store the agent connection
        const agent = {
            id: agentId,
            url,
            apiService,
            name: agentName,
            status: 'connecting',
            state: null
        };

        // Set up event listeners to track connection state
        apiService.on('status', (status) => {
            agent.status = status;
            if (this.agents.has(agentId)) {
                this.agents.get(agentId).status = status;
            }
        });

        apiService.on('state_update', (state) => {
            agent.state = apiService.getTuiStatus();
            if (this.agents.has(agentId)) {
                this.agents.get(agentId).state = agent.state;
            }
        });

        this.agents.set(agentId, agent);
        return agent;
    }

    async disconnect(agentId) {
        const agent = this.agents.get(agentId);
        if (agent) {
            agent.apiService.disconnect();
            this.agents.delete(agentId);
        }
    }

    getAgent(agentId) {
        return this.agents.get(agentId);
    }

    getAllAgents() {
        return Array.from(this.agents.values());
    }

    /**
     * Scan for available agents on common ports
     */
    async discoverAgents(ports = [8080, 8081, 8082, 8083]) {
        const discovered = [];

        // Test connections sequentially with shorter timeouts to reduce noise
        for (const port of ports) {
            const url = `ws://localhost:${port}`;
            const agentId = `discovered-${port}`;

            // Add a small delay between connection tests to reduce system load
            if (discovered.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (await this.testConnection(url)) {
                discovered.push({
                    id: agentId,
                    url,
                    name: `Local Agent (Port ${port})`,
                    status: 'available'
                });
            }
        }

        // Add common default addresses too (but don't test if already found)
        const defaultUrls = [
            {id: 'default-8081', url: 'ws://localhost:8081', name: 'Local Agent (Port 8081)'},
            {id: 'default-8080', url: 'ws://localhost:8080', name: 'Local Agent (Port 8080)'},
            {id: 'remote-agent', url: 'ws://127.0.0.1:8081', name: 'Remote Agent (127.0.0.1:8081)'}
        ];

        // Test default URLs
        for (const {id, url, name} of defaultUrls) {
            // Skip if already discovered
            if (discovered.some(a => a.url === url)) continue;

            // Add a small delay between connection tests
            if (discovered.length > 0 || defaultUrls.indexOf({id, url, name}) > 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (await this.testConnection(url)) {
                const existing = discovered.find(a => a.url === url);
                if (!existing) {
                    discovered.push({id, url, name, status: 'available'});
                }
            }
        }

        // Update our discovered agents
        this.discoveredAgents.clear();
        for (const agent of discovered) {
            this.discoveredAgents.set(agent.id, agent);
        }

        return discovered;
    }

    /**
     * Test if an agent is available at a given URL
     */
    async testConnection(url) {
        try {
            // For now, we'll use a simple check by attempting to create a connection
            // using the existing AgentCommunicationService
            const AgentCommunicationService = (await import('@senars/common/services/AgentCommunicationService.js')).default;
            const commService = new AgentCommunicationService(url);

            return new Promise((resolve) => {
                // Reduce timeout to minimize connection spam and logging
                const timer = setTimeout(() => {
                    commService.disconnect();
                    resolve(false);
                }, 1000); // 1 second timeout for faster discovery

                commService.on('status', (status) => {
                    if (status === 'connected') {
                        clearTimeout(timer);
                        commService.disconnect();
                        resolve(true);
                    } else if (status === 'failed' || status === 'disconnected') {
                        clearTimeout(timer);
                        commService.disconnect();
                        resolve(false);
                    }
                });

                commService.on('error', () => {
                    clearTimeout(timer);
                    commService.disconnect();
                    resolve(false);
                });

                commService.connect();
            });
        } catch (error) {
            // Silently fail connection tests to reduce noise
            return false;
        }
    }

    getDiscoveredAgents() {
        return Array.from(this.discoveredAgents.values());
    }
}

// Export a singleton instance
export default AgentManager.getInstance();