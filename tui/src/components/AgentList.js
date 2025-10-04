import React from 'react';
import {Box, Text} from 'ink';

const AgentList = ({agents, onConnect, onDisconnect, connectedAgents, isDiscovering}) => {
    const connectedAgentIds = connectedAgents.map(agent => agent.id);

    const handleConnect = (agent) => {
        // Skip connection for hint messages
        if (agent.status === 'hint') return;

        const isConnected = connectedAgentIds.includes(agent.id);
        if (!isConnected) {
            onConnect(agent.id, agent.url, agent.name);
        } else {
            onDisconnect(agent.id);
        }
    };

    return React.createElement(Box, {flexDirection: "column"},
        ...agents.map((agent) => {
            // Special handling for hint messages
            if (agent.status === 'hint') {
                return React.createElement(Box, {key: agent.id, flexDirection: "row", marginBottom: 1},
                    React.createElement(Text, {color: "gray"},
                        agent.name
                    )
                );
            }

            const isConnected = connectedAgentIds.includes(agent.id);
            let statusColor;
            if (isDiscovering && agent.status === 'discovering...') {
                statusColor = 'blue';
            } else {
                statusColor = agent.status === 'connected' ? 'green' :
                    agent.status === 'connecting' ? 'yellow' :
                        agent.status === 'available' ? 'cyan' : 'red';
            }

            return React.createElement(Box, {key: agent.id, flexDirection: "row", marginBottom: 1},
                React.createElement(Text, {color: statusColor},
                    isConnected ? '●' : '○'
                ),
                React.createElement(Box, {marginLeft: 1, flexGrow: 1},
                    React.createElement(Text, null, agent.name),
                    React.createElement(Text, {color: 'gray'},
                        agent.url
                    )
                ),
                React.createElement(Box, null,
                    React.createElement(Text, {color: isConnected ? 'red' : 'green'},
                        isConnected ? ' DISCONNECT ' : ' CONNECT '
                    )
                )
            );
        }),
        ...(agents.length === 0 && !isDiscovering ? [
            React.createElement(Text, {color: 'gray'},
                "No agents discovered. Try starting an agent service."
            )
        ] : [])
    );
};

export default AgentList;