import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { connectionManager } from '@senars/common';
import TuiAgentService from './services/TuiAgentService.js';
import AgentView from './components/AgentView.jsx';
import ConnectionDiscovery from './components/ConnectionDiscovery.jsx';

const App = () => {
    const [connections, setConnections] = useState([]);
    const [selectedConnection, setSelectedConnection] = useState(null);
    const [connectionError, setConnectionError] = useState(null);

    useEffect(() => {
        const handleUpdate = () => {
            setConnections(connectionManager.getConnections());
            setConnectionError(null);
        };

        const handleError = ({ url, error }) => {
            setConnectionError(`Failed to connect to ${url}: ${error.message}`);
        };

        connectionManager.on('update', handleUpdate);
        connectionManager.on('error', handleError);
        connectionManager.discover();

        return () => {
            connectionManager.off('update', handleUpdate);
            connectionManager.off('error', handleError);
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
            error={connectionError}
            onSelectConnection={handleSelectConnection}
        />
    );
};

export default App;