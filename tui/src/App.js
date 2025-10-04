import React, {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import AgentManager from './services/AgentManager.js';
import AgentList from './components/AgentList.js';
import AgentStatus from './components/AgentStatus.js';
import NarseseInput from './components/interaction/NarseseInput.js';
import TasksPanel from './components/task/TasksPanel.js';
import BeliefsPanel from './components/memory/BeliefsPanel.js';

const App = () => {
    const [agents, setAgents] = useState([]);
    const [activeAgentId, setActiveAgentId] = useState(null);
    const [discoveredAgents, setDiscoveredAgents] = useState([]);
    const [isDiscovering, setIsDiscovering] = useState(false);

    // Initialize agent manager and discover agents
    useEffect(() => {
        const discoverAndSetAgents = async () => {
            setIsDiscovering(true);
            try {
                const discovered = await AgentManager.discoverAgents();
                if (discovered.length === 0) {
                    // Show helpful message when no agents are found
                    setDiscoveredAgents([
                        {id: 'no-agents', url: '', name: 'No agents discovered', status: 'disconnected'},
                        {id: 'hint-1', url: '', name: 'Try running: npm run agent:ws', status: 'hint'},
                        {id: 'hint-2', url: '', name: 'or: npm run dev:ws', status: 'hint'},
                    ]);
                } else {
                    setDiscoveredAgents(discovered);
                }
            } catch (error) {
                console.error('Error discovering agents:', error.message);
                // Fallback to default agents with helpful hints
                setDiscoveredAgents([
                    {
                        id: 'default',
                        url: 'ws://localhost:8081',
                        name: 'Local Agent (Port 8081)',
                        status: 'disconnected'
                    },
                    {
                        id: 'alt-port',
                        url: 'ws://localhost:8080',
                        name: 'Local Agent (Port 8080)',
                        status: 'disconnected'
                    },
                    {id: 'hint-1', url: '', name: 'Try running: npm run agent:ws', status: 'hint'},
                ]);
            } finally {
                setIsDiscovering(false);
            }
        };

        // Initialize with default agents while discovery runs
        setDiscoveredAgents([
            {id: 'default', url: 'ws://localhost:8081', name: 'Local Agent (Port 8081)', status: 'discovering...'},
            {id: 'alt-port', url: 'ws://localhost:8080', name: 'Local Agent (Port 8080)', status: 'discovering...'},
        ]);

        // Run discovery after a brief delay
        const discoveryTimer = setTimeout(discoverAndSetAgents, 500);

        // Set up periodic discovery every 30 seconds to find new agents
        const periodicDiscovery = setInterval(() => {
            if (!isDiscovering) {
                AgentManager.discoverAgents().then(discovered => {
                    if (discovered.length === 0) {
                        // Don't update if no agents found and we already have hints
                        setDiscoveredAgents(current => {
                            if (current.some(a => a.status === 'hint')) {
                                return current; // Keep existing hints
                            }
                            return [
                                {id: 'no-agents', url: '', name: 'No agents discovered', status: 'disconnected'},
                                {id: 'hint-1', url: '', name: 'Try running: npm run agent:ws', status: 'hint'},
                                {id: 'hint-2', url: '', name: 'or: npm run dev:ws', status: 'hint'},
                            ];
                        });
                    } else {
                        setDiscoveredAgents(discovered);
                    }
                }).catch(console.error);
            }
        }, 30000); // Every 30 seconds

        return () => {
            clearTimeout(discoveryTimer);
            clearInterval(periodicDiscovery);
        };
    }, [isDiscovering]);

    const connectToAgent = async (agentId, agentUrl, agentName) => {
        try {
            const agent = await AgentManager.connect(agentId, agentUrl, agentName);
            setAgents(prev => [...prev, agent]);
            setActiveAgentId(agentId);
        } catch (error) {
            // Suppress connection errors to reduce noise when agents aren't available
            // These errors are already logged by the underlying services
            if (process.env.NODE_ENV !== 'development') {
                // Only show errors in development mode
                console.debug(`Failed to connect to agent ${agentId}:`, error.message);
            } else {
                console.error(`Failed to connect to agent ${agentId}:`, error.message);
            }
        }
    };

    const disconnectFromAgent = async (agentId) => {
        await AgentManager.disconnect(agentId);
        setAgents(prev => prev.filter(agent => agent.id !== agentId));
        if (activeAgentId === agentId) {
            setActiveAgentId(null);
        }
    };

    const refreshDiscovery = async () => {
        setIsDiscovering(true);
        try {
            const discovered = await AgentManager.discoverAgents();
            setDiscoveredAgents(discovered);
        } catch (error) {
            console.error('Error discovering agents:', error.message);
        } finally {
            setIsDiscovering(false);
        }
    };

    const activeAgent = agents.find(agent => agent.id === activeAgentId);

    // Handler for Narsese input
    const handleTaskAdded = (task) => {
        console.log(`Task added: ${task}`);
    };

    const handleError = (error) => {
        console.error(`TUI Error: ${error}`);
    };

    return React.createElement(Box, {flexDirection: "column", padding: 1, height: "100%"},
        React.createElement(Text, {color: "blue", bold: true},
            "SENARS Multi-Agent TUI"
        ),
        React.createElement(Box, {flexDirection: "row", height: "70%"},
            // Left column: Agent connections and Narsese input
            React.createElement(Box, {flexDirection: "column", width: "30%"},
                React.createElement(Box, {
                        flexDirection: "column",
                        height: "40%",
                        borderStyle: "round",
                        padding: 1,
                        marginBottom: 1
                    },
                    React.createElement(Box, {flexDirection: "row", justifyContent: "space-between", marginBottom: 1},
                        React.createElement(Text, {color: "yellow", bold: true},
                            "Agent Connections"
                        ),
                        React.createElement(Text, {color: "blue"},
                            isDiscovering ? 'Scanning...' : 'Refresh'
                        )
                    ),
                    React.createElement(AgentList, {
                        agents: discoveredAgents,
                        onConnect: connectToAgent,
                        onDisconnect: disconnectFromAgent,
                        connectedAgents: agents,
                        isDiscovering: isDiscovering
                    })
                ),
                React.createElement(Box, {flexDirection: "column", height: "60%", borderStyle: "round", padding: 1},
                    React.createElement(Text, {color: "cyan", bold: true},
                        "Narsese Input"
                    ),
                    activeAgent
                        ? React.createElement(NarseseInput, {
                            agent: activeAgent,
                            onTaskAdded: handleTaskAdded,
                            onError: handleError
                        })
                        : React.createElement(Text, {color: "gray"},
                            "Connect to an agent to enable input"
                        )
                )
            ),

            // Right column: Status, tasks, and beliefs
            React.createElement(Box, {flexDirection: "column", width: "70%"},
                React.createElement(Box, {flexDirection: "row", height: "50%", marginBottom: 1},
                    // Status panel (left half of right column)
                    React.createElement(Box, {
                            flexDirection: "column",
                            width: "50%",
                            borderStyle: "round",
                            padding: 1,
                            marginRight: 1
                        },
                        React.createElement(Text, {color: "green", bold: true},
                            "Active Agent Status"
                        ),
                        activeAgent
                            ? React.createElement(AgentStatus, {agent: activeAgent})
                            : React.createElement(Text, {color: "gray"},
                                "No agent selected"
                            )
                    ),
                    // Tasks panel (right half of right column)
                    React.createElement(Box, {flexDirection: "column", width: "50%", borderStyle: "round", padding: 1},
                        React.createElement(Text, {color: "yellow", bold: true},
                            "Tasks"
                        ),
                        activeAgent
                            ? React.createElement(TasksPanel, {agent: activeAgent})
                            : React.createElement(Text, {color: "gray"},
                                "Connect to an agent to view tasks"
                            )
                    )
                ),
                // Beliefs panel (bottom half of right column)
                React.createElement(Box, {flexDirection: "column", height: "50%", borderStyle: "round", padding: 1},
                    React.createElement(Text, {color: "green", bold: true},
                        "Beliefs"
                    ),
                    activeAgent
                        ? React.createElement(BeliefsPanel, {agent: activeAgent})
                        : React.createElement(Text, {color: "gray"},
                            "Connect to an agent to view beliefs"
                        )
                )
            )
        ),
        React.createElement(Text, {color: "gray"},
            "Use arrow keys to navigate • Press Ctrl+C to quit"
        )
    );
};

export default App;