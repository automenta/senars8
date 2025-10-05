import React, {useEffect, useState, useCallback, useMemo} from 'react';
import {Box, Text, Static, useInput, useApp} from 'ink';
import {connectionManager} from '@senars/common';
import logger, { TuiTransport } from '../../core/utils/logger.js';
import TuiAgentService from './services/TuiAgentService.js';
import AgentView from './components/AgentView.jsx';
import ConnectionDiscovery from './components/ConnectionDiscovery.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { LoadingProgress, ConnectionStatus } from './components/LoadingStates.jsx';
import { theme } from './theme.js';
import { Container, Panel, Flex, MainLayout, SplitPane } from './components/Layout.jsx';
import { Card, Badge, ProgressBar, Button } from './components/Interactive.jsx';
import { formatDuration, debounce, LOG_LEVELS, LOG_LEVEL_CONFIG } from './utils/uiHelpers.js';
import { useFocusManager } from './hooks/useMouseInteraction.js';

// Modern Transcript Panel Component for displaying captured logs
const TranscriptPanel = ({logs = [], title = "System Transcript", maxHeight = 12}) => {

    return (
        <Panel title={`${title} (${logs.length} entries)`} height={maxHeight} variant="primary">
            {logs.length === 0 ? (
                <Text color={theme.colors.textMuted}>No logs yet...</Text>
            ) : (
                <Static items={logs.slice(-50)}>
                    {(log, index) => {
                        const color = LOG_LEVEL_CONFIG.COLORS[log.level] || theme.colors.text;
                        const level = LOG_LEVEL_CONFIG.NAMES[log.level] || 'UNK';

                        return (
                            <Box key={index} marginBottom={0}>
                                <Box width={4} marginRight={1}>
                                    <Badge variant={log.level <= LOG_LEVELS.WARN ? 'error' : log.level === LOG_LEVELS.INFO ? 'info' : 'primary'} size="sm">
                                        {level}
                                    </Badge>
                                </Box>
                                <Text color={color} wrap="wrap">
                                    {log.message}
                                </Text>
                            </Box>
                        );
                    }}
                </Static>
            )}
        </Panel>
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
    const globalFocusManager = useFocusManager();

    // Global keyboard shortcuts with enhanced focus management
    useInput((input, key) => {
        // Tab navigation (when not in input fields)
        if (key.tab) {
            globalFocusManager.focusNext();
        } else if (key.shift && key.tab) {
            globalFocusManager.focusPrev();
        } else if (key.escape) {
            globalFocusManager.clearFocus();
        }
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

    const handleSelectConnection = useCallback((url) => {
        // Use embedded mode if no URL provided or if explicitly 'embedded'
        const connectionUrl = url || 'embedded';
        const service = new TuiAgentService(connectionUrl);
        service.connect();
        setSelectedConnection({url: connectionUrl, service});
    }, []);

    const handleDisconnect = useCallback(() => {
        if (selectedConnection) {
            selectedConnection.service.disconnect();
            setSelectedConnection(null);
        }
    }, [selectedConnection]);

    // Memoize transcript panel to prevent unnecessary re-renders
    const transcriptPanel = useMemo(() => (
        <TranscriptPanel logs={transcriptLogs} title="System Transcript"/>
    ), [transcriptLogs]);

    if (selectedConnection) {
        return (
            <ErrorBoundary>
                <Container flexDirection="column" width="100%">
                    {/* Modern Header */}
                    <Card variant="primary" padding={theme.spacing.md} marginBottom={theme.spacing.sm}>
                        <Flex justifyContent="space-between" alignItems="center">
                            <Box flexDirection="column">
                                <Flex alignItems="center" gap={theme.spacing.sm}>
                                    <Text bold color={theme.colors.primary}>SENARS</Text>
                                    <Badge variant="success">v0.2.0</Badge>
                                </Flex>
                                <Text color={theme.colors.textMuted}>
                                    {process.stdin.isTTY && process.stdin.setRawMode ?
                                        "🎹 Keyboard: Ctrl+C exit • 🔢 Tabs: 1-4 • 🖱️ Mouse: Click • Tab: Navigate • Enter: Select" :
                                        "🖱️ Mouse/click navigation • Type 'quit' to exit"}
                                </Text>
                            </Box>
                            <Box flexDirection="column" alignItems="flex-end">
                                <Flex alignItems="center" gap={theme.spacing.sm}>
                                    <ConnectionStatus
                                        isConnected={true}
                                        connectionUrl={selectedConnection.url}
                                    />
                                    <Button variant="error" size="sm" onClick={handleDisconnect}>
                                        Disconnect
                                    </Button>
                                </Flex>
                                <Text color={theme.colors.textMuted}>
                                    {new Date().toLocaleTimeString()}
                                </Text>
                            </Box>
                        </Flex>
                    </Card>

                    {/* Main Content Area with Responsive Layout */}
                    <MainLayout showSidebar={true} sidebarWidth={35} flexGrow={1}>
                        {/* Main Interface */}
                        <ErrorBoundary>
                            <AgentView
                                agentService={selectedConnection.service}
                                globalFocusManager={globalFocusManager}
                            />
                        </ErrorBoundary>

                        {/* System Transcript Sidebar */}
                        <ErrorBoundary>
                            {transcriptPanel}
                        </ErrorBoundary>
                    </MainLayout>
                </Container>
            </ErrorBoundary>
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