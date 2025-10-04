import React, {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import {connectionManager} from '@senars/common';
import logger from '../../core/utils/logger.js';
import TuiAgentService from './services/TuiAgentService.js';
import AgentView from './components/AgentView.jsx';
import ConnectionDiscovery from './components/ConnectionDiscovery.jsx';

const log = logger.create('TUI-App');

const App = () => {
    const [connections, setConnections] = useState([]);
    const [selectedConnection, setSelectedConnection] = useState(null);
    const [connectionError, setConnectionError] = useState(null);
    const [isDiscovering, setIsDiscovering] = useState(true);

    useEffect(() => {
        const handleUpdate = () => {
            setConnections(connectionManager.getConnections());
            setConnectionError(null);
            setIsDiscovering(false);
        };

        const handleError = ({url, error}) => {
            setConnectionError(`Failed to connect to ${url}: ${error.message}`);
            setIsDiscovering(false);
        };

        const handleConnection = ({url, status}) => {
            log.info(`Connection status: ${url} - ${status}`);
        };

        connectionManager.on('update', handleUpdate);
        connectionManager.on('error', handleError);
        connectionManager.on('connection', handleConnection);

        // Start discovery with timeout
        setIsDiscovering(true);

        // Set a timeout for discovery to prevent hanging
        const discoveryTimeout = setTimeout(() => {
            if (connections.length === 0) {
                setConnectionError('No agents found after timeout. Please ensure an agent is running.');
                setIsDiscovering(false);
            }
        }, 10000); // 10 second timeout

        connectionManager.discover();

        return () => {
            clearTimeout(discoveryTimeout);
        };

        return () => {
            connectionManager.off('update', handleUpdate);
            connectionManager.off('error', handleError);
            connectionManager.off('connection', handleConnection);
            connectionManager.disconnectAll();
        };
    }, []);

    const handleSelectConnection = (url) => {
        const service = new TuiAgentService(url);
        service.connect();
        setSelectedConnection({url, service});
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
                <AgentView agentService={selectedConnection.service}/>
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
            isDiscovering={isDiscovering}
            onSelectConnection={handleSelectConnection}
        />
    );
};

export default App;