import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Box, Static, Text, useApp, useInput} from 'ink';
import {connectionManager} from '@senars/common';
import logger, {TuiTransport} from '../../core/utils/logger.js';
import TuiAgentService from './services/TuiAgentService.js';
import AgentView from './components/AgentView.jsx';
import SimpleDemoRunner from './components/SimpleDemoRunner.jsx';
import ConnectionDiscovery from './components/ConnectionDiscovery.jsx';
import {ErrorBoundary} from './components/ErrorBoundary.jsx';
import {ConnectionStatus} from './components/LoadingStates.jsx';
import {theme} from './theme.js';
import {Container, Flex, MainLayout, Panel} from './components/Layout.jsx';
import {Badge, Button, Card} from './components/Interactive.jsx';
import {LOG_LEVEL_CONFIG, LOG_LEVELS} from './utils/uiHelpers.js';
import {useFocusManager} from './hooks/useMouseInteraction.js';

// Modern Transcript Panel Component for displaying captured logs
const TranscriptPanel = ({logs = [], title = "System Transcript", maxHeight = 12}) => {
    const screenSize = { width: 120, height: 30 }; // Default fallback

    // Adaptive height based on screen size
    const adaptiveHeight = React.useMemo(() => {
        if (screenSize.height < 20) return Math.max(6, screenSize.height - 8);
        if (screenSize.height < 30) return Math.max(8, screenSize.height - 12);
        return Math.max(10, screenSize.height - 15);
    }, [screenSize.height]);

    const displayLogs = React.useMemo(() =>
        logs.length === 0 ? [
            { message: 'TUI started successfully', level: 2, timestamp: new Date() },
            { message: 'Ready for interaction', level: 2, timestamp: new Date() }
        ] : logs.slice(-Math.floor(adaptiveHeight * 2)), // Show more logs on larger screens
        [logs, adaptiveHeight]
    );

    return (
        <Panel title={`${title} (${displayLogs.length} entries)`} height={adaptiveHeight} variant="primary">
            {displayLogs.length === 0 ? (
                <Text color={theme.colors.textMuted}>Initializing logs...</Text>
            ) : (
                <Static items={displayLogs}>
                    {(log, index) => {
                        const color = LOG_LEVEL_CONFIG.COLORS[log.level] || theme.colors.text;
                        const level = LOG_LEVEL_CONFIG.NAMES[log.level] || 'UNK';
                        const timeStr = log.timestamp ? log.timestamp.toLocaleTimeString() : '';

                        return (
                            <Box key={index} marginBottom={0}>
                                <Box width={6} marginRight={1}>
                                    <Badge
                                        variant={log.level <= LOG_LEVELS.WARN ? 'error' : log.level === LOG_LEVELS.INFO ? 'info' : 'primary'}
                                        size="sm">
                                        {level}
                                    </Badge>
                                </Box>
                                <Box flexDirection="column" flexGrow={1}>
                                    <Text color={color} wrap="wrap">
                                        {log.message}
                                    </Text>
                                    {timeStr && (
                                        <Text color={theme.colors.textMuted} dimColor>
                                            {timeStr}
                                        </Text>
                                    )}
                                </Box>
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

const App = ({onExit, initialMode = 'agent'}) => {
    const [connections, setConnections] = useState([]);
    const [selectedConnection, setSelectedConnection] = useState(null);
    const [connectionError, setConnectionError] = useState(null);
    const [isDiscovering, setIsDiscovering] = useState(true);
    const [transcriptLogs, setTranscriptLogs] = useState([]);
    const [tuiLogger, setTuiLogger] = useState(null);
    const [currentMode, setCurrentMode] = useState(initialMode); // 'agent' or 'demos'
    const {exit} = useApp();
    const globalFocusManager = useFocusManager();

    // Global keyboard shortcuts with enhanced focus management
    useInput((input, key) => {
        // Tab navigation (when not in input fields)
        if (key.tab) {
            globalFocusManager.focusNext();
            return;
        }
        if (key.shift && key.tab) {
            globalFocusManager.focusPrev();
            return;
        }

        // Number keys for direct tab selection (1-4)
        if (input >= '1' && input <= '4') {
            const tabIndex = parseInt(input) - 1;
            const tabElement = globalFocusManager.focusOrder.find(el => el.index === tabIndex);
            if (tabElement) {
                globalFocusManager.pushFocus(tabElement.id);
                if (tabElement.onActivate) {
                    tabElement.onActivate();
                }
            }
            return;
        }

        // Arrow keys for navigation
        if (key.leftArrow || key.rightArrow || key.upArrow || key.downArrow) {
            if (key.leftArrow || key.rightArrow) {
                if (key.leftArrow) {
                    globalFocusManager.focusPrev();
                } else {
                    globalFocusManager.focusNext();
                }
            }
            return;
        }

        // Letter keys for tab navigation (h/l for left/right)
        if (input === 'h' || input === 'l') {
            if (input === 'h') {
                globalFocusManager.focusPrev();
            } else {
                globalFocusManager.focusNext();
            }
            return;
        }

        // Enter key to activate focused element
        if (key.return) {
            const currentFocus = globalFocusManager.currentFocus;
            if (currentFocus) {
                const element = globalFocusManager.focusOrder.find(el => el.id === currentFocus);
                if (element && element.onActivate) {
                    element.onActivate();
                }
            }
            return;
        }

        // Escape key to clear focus
        if (key.escape) {
            globalFocusManager.clearFocus();
            return;
        }

        // Mode switching
        if (input === 'm') {
            setCurrentMode(currentMode === 'agent' ? 'demos' : 'agent');
            return;
        }

        // Ctrl+C is handled by the SIGINT handler in index.jsx
    });

    useEffect(() => {
        // Set up TUI transport to capture all logs
        const tuiTransport = new TuiTransport((logMessage, level) => {
            setTranscriptLogs(prev => [...prev.slice(-199), {
                message: logMessage,
                level,
                timestamp: new Date()
            }]);
        });

        // Add TUI transport to the main logger
        logger.transports.push(tuiTransport);

        // Initialize with some sample logs to show the transcript is working
        setTranscriptLogs([
            { message: 'TUI started successfully', level: 2, timestamp: new Date() },
            { message: currentMode === 'demos' ? 'Demo Runner mode activated' : 'Initializing embedded agent...', level: 2, timestamp: new Date() },
            { message: 'Ready for interaction', level: 2, timestamp: new Date() }
        ]);

        // Skip agent initialization in demo mode
        if (currentMode === 'demos') {
            setIsDiscovering(false);
            return;
        }

        // Immediately create and connect to embedded agent (agent mode only)
        const initializeTui = async () => {
            try {
                logger.info('Creating embedded agent for TUI...');
                await connectionManager.createEmbedded();

                // Give it a moment to initialize
                setTimeout(() => {
                    setIsDiscovering(false);
                    handleSelectConnection('embedded');
                    // Add connection success log
                    setTranscriptLogs(prev => [...prev, {
                        message: 'Connected to embedded agent',
                        level: 2,
                        timestamp: new Date()
                    }]);
                }, 500);
            } catch (error) {
                setConnectionError(`Failed to create embedded agent: ${error.message}`);
                setIsDiscovering(false);
                logger.error('Failed to create embedded agent:', error);
                setTranscriptLogs(prev => [...prev, {
                    message: `Failed to create embedded agent: ${error.message}`,
                    level: 0,
                    timestamp: new Date()
                }]);
            }
        };

        initializeTui();

        return () => {
            // Remove TUI transport when component unmounts
            logger.transports = logger.transports.filter(t => t !== tuiTransport);
            connectionManager.disconnectAll();
        };
    }, [currentMode]);

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

    if (currentMode === 'agent' && !selectedConnection) {
        return (
            <ConnectionDiscovery
                connections={connections}
                error={connectionError}
                isDiscovering={isDiscovering}
                onSelectConnection={handleSelectConnection}
            />
        );
    }

    return (
        <ErrorBoundary>
            <Container flexDirection="column" width="100%">
                {/* Clean Mode Header - Only showing mode and essential controls */}
                <Box width="100%" paddingX={theme.spacing.sm} paddingY={theme.spacing.xs} borderStyle="single" borderColor={theme.colors.border}>
                    <Flex justifyContent="space-between" alignItems="center">
                        <Box>
                            <Flex alignItems="center" gap={theme.spacing.sm}>
                                <Text bold>SeNARS Demo Runner</Text>
                                <Badge variant={currentMode === 'agent' ? 'info' : 'secondary'}>
                                    {currentMode === 'agent' ? '🤖 Agent' : '🎓 Demos'}
                                </Badge>
                            </Flex>
                        </Box>
                        <Box>
                            <Flex alignItems="center" gap={theme.spacing.sm}>
                                <Button variant="info" size="sm" onClick={() => setCurrentMode('agent')}>
                                    Agent Mode
                                </Button>
                            </Flex>
                        </Box>
                    </Flex>
                </Box>

                {/* Main Content Area with Compact Layout */}
                {currentMode === 'agent' ? (
                    <MainLayout showSidebar={true} sidebarWidth={30} flexGrow={1}>
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
                ) : (
                    <ErrorBoundary>
                        <SimpleDemoRunner onExit={onExit} />
                    </ErrorBoundary>
                )}
            </Container>
        </ErrorBoundary>
    );

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