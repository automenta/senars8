import React, {useEffect, useState} from 'react';
import {Box, Text, Static, useInput, useApp} from 'ink';
import {connectionManager} from '@senars/common';
import logger, { TuiTransport } from '../../core/utils/logger.js';
import TuiAgentService from './services/TuiAgentService.js';
import AgentView from './components/AgentView.jsx';
import ConnectionDiscovery from './components/ConnectionDiscovery.jsx';

// Transcript Panel Component for displaying captured logs
const TranscriptPanel = ({logs = [], title = "Transcript", maxHeight = 10}) => {
    return (
        <Box flexDirection="column" borderStyle="single" height={maxHeight}>
            <Box padding={1} borderStyle="single" borderBottom={false}>
                <Text bold>{title}</Text>
                <Text color="gray" marginLeft={1}>({logs.length} entries)</Text>
            </Box>
            <Box flexDirection="column" flexGrow={1} padding={1}>
                {logs.length === 0 ? (
                    <Text color="gray">No logs yet...</Text>
                ) : (
                    <Static items={logs.slice(-50)}>
                        {(log, index) => {
                            const levelColors = {
                                0: 'red',     // ERROR
                                1: 'yellow',  // WARN
                                2: 'blue',    // INFO
                                3: 'magenta'  // DEBUG
                            };
                            const color = levelColors[log.level] || 'white';

                            return (
                                <Text key={index} color={color} wrap="wrap">
                                    {log.message}
                                </Text>
                            );
                        }}
                    </Static>
                )}
            </Box>
        </Box>
    );
};

// Force auto-connect for better UX

const log = logger.create('TUI-App');

const App = ({onExit}) => {
    const [connections, setConnections] = useState([]);
    const [selectedConnection, setSelectedConnection] = useState(null);
    const [connectionError, setConnectionError] = useState(null);
    const [isDiscovering, setIsDiscovering] = useState(true);
    const [transcriptLogs, setTranscriptLogs] = useState([]);
    const [tuiLogger, setTuiLogger] = useState(null);
    const {exit} = useApp();

    // Global keyboard shortcuts (except Ctrl+C which is handled by SIGINT)
    useInput((input, key) => {
        // Other global shortcuts can be added here if needed
        // Ctrl+C is handled by the SIGINT handler in index.jsx
    });

    useEffect(() => {
        // Set up TUI transport to capture all logs
        const tuiTransport = new TuiTransport((logMessage, level) => {
            setTranscriptLogs(prev => [...prev.slice(-999), {
                message: logMessage,
                level,
                timestamp: new Date()
            }]);
        });

        // Add TUI transport to the main logger
        logger.transports.push(tuiTransport);

        // Immediately create and connect to embedded agent
        const initializeTui = async () => {
            try {
                logger.info('Creating embedded agent for TUI...');
                await connectionManager.createEmbedded();

                // Give it a moment to initialize
                setTimeout(() => {
                    setIsDiscovering(false);
                    handleSelectConnection('embedded');
                }, 500);
            } catch (error) {
                setConnectionError(`Failed to create embedded agent: ${error.message}`);
                setIsDiscovering(false);
                logger.error('Failed to create embedded agent:', error);
            }
        };

        initializeTui();

        return () => {
            // Remove TUI transport when component unmounts
            logger.transports = logger.transports.filter(t => t !== tuiTransport);
            connectionManager.disconnectAll();
        };
    }, []);

    const handleSelectConnection = (url) => {
        // Use embedded mode if no URL provided or if explicitly 'embedded'
        const connectionUrl = url || 'embedded';
        const service = new TuiAgentService(connectionUrl);
        service.connect();
        setSelectedConnection({url: connectionUrl, service});
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
                {/* Header */}
                <Box borderStyle="single" padding={1} marginBottom={1}>
                    <Box flexDirection="column">
                        <Text bold>SENARS - Text User Interface</Text>
                        <Text color="gray">
                            {process.stdin.isTTY && process.stdin.setRawMode ?
                                "Keyboard: Ctrl+C to exit | Tab navigation: 1-4 or ←/→ arrows | Enter to select" :
                                "Limited input mode: Type 'quit' to exit | Mouse/click navigation"}
                        </Text>
                    </Box>
                    <Box marginLeft="auto" flexDirection="column" alignItems="flex-end">
                        <Text>Connected: {selectedConnection.url}</Text>
                        <Text color="red" onPress={handleDisconnect}>[Disconnect]</Text>
                    </Box>
                </Box>

                {/* Main Content Area */}
                <Box flexDirection="row" flexGrow={1}>
                    {/* Left Panel - Main Interface */}
                    <Box flexDirection="column" width="75%">
                        <AgentView agentService={selectedConnection.service}/>
                    </Box>

                    {/* Right Panel - Transcript/Logs */}
                    <Box flexDirection="column" width="25%" marginLeft={1}>
                        <TranscriptPanel logs={transcriptLogs} title="System Transcript"/>
                    </Box>
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