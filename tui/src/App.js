import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { connectionManager } from '@senars/common';
import TuiAgentService from './services/TuiAgentService.js';
import AgentView from './components/AgentView.js';
import ConnectionDiscovery from './components/ConnectionDiscovery.js';

const App = () => {
    const [connections, setConnections] = useState([]);
    const [selectedConnection, setSelectedConnection] = useState(null);

    useEffect(() => {
        const handleUpdate = () => {
            setConnections(connectionManager.getConnections());
        };

        connectionManager.on('update', handleUpdate);
        connectionManager.discover();

        return () => {
            connectionManager.off('update', handleUpdate);
            connectionManager.disconnectAll();
        };
    }, []);

    const handleSelectConnection = (url) => {
        const service = new TuiAgentService(url);
        service.connect();
        setSelectedConnection({ url, service });
    };

    const handleDisconnect = () => {
        if (selectedConnection) {
            selectedConnection.service.disconnect();
            setSelectedConnection(null);
        }
    };

    if (selectedConnection) {
        return (
            <Box flexDirection="column" width="100%">
                <Text>Connected to: {selectedConnection.url}</Text>
                <AgentView agentService={selectedConnection.service} />
                <Box marginTop={1}>
                    <Text onPress={handleDisconnect} color="red">Disconnect</Text>
                </Box>
            </Box>
        );
    }

    return (
        <ConnectionDiscovery
            connections={connections}
            onSelectConnection={handleSelectConnection}
        />
    );
};

export default App;