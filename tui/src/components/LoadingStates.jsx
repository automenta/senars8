import React from 'react';
import {Box, Text} from 'ink';
import {theme} from '../theme.js';
import {Card, ProgressBar} from './Interactive.jsx';

// Loading skeleton for status panels
export const StatusSkeleton = () => (
    <Card variant="primary" padding={theme.spacing.sm}>
        <Box flexDirection="column">
            <Box marginBottom={theme.spacing.xs}>
                <Text color={theme.colors.textMuted}>🤖 Loading agent status...</Text>
            </Box>
            <Box marginBottom={theme.spacing.xs}>
                <Text color={theme.colors.textMuted}>📊 Loading performance stats...</Text>
            </Box>
            <Box marginBottom={theme.spacing.xs}>
                <Text color={theme.colors.textMuted}>🧠 Loading knowledge base...</Text>
            </Box>
            <Box>
                <ProgressBar progress={0} max={100} width={20} color={theme.colors.primary}/>
            </Box>
        </Box>
    </Card>
);

// Loading skeleton for task lists
export const TasksSkeleton = () => (
    <Card variant="warning" padding={theme.spacing.sm}>
        <Box flexDirection="column">
            <Text color={theme.colors.textMuted}>⚡ Loading tasks...</Text>
            <Box marginTop={theme.spacing.xs}>
                {[1, 2, 3].map(i => (
                    <Box key={i} marginBottom={theme.spacing.xs}>
                        <Text color={theme.colors.textMuted}>• Loading task {i}...</Text>
                    </Box>
                ))}
            </Box>
        </Box>
    </Card>
);

// Loading skeleton for logs
export const LogsSkeleton = () => (
    <Card variant="info" padding={theme.spacing.sm}>
        <Box flexDirection="column">
            <Text color={theme.colors.textMuted}>📝 Loading system logs...</Text>
            <Box marginTop={theme.spacing.xs}>
                {[1, 2, 3, 4, 5].map(i => (
                    <Box key={i} marginBottom={0}>
                        <Text color={theme.colors.textMuted}>Loading log entry {i}...</Text>
                    </Box>
                ))}
            </Box>
        </Box>
    </Card>
);

// Generic loading spinner component
export const LoadingSpinner = ({
                                   message = "Loading...",
                                   color = theme.colors.primary,
                                   size = "md"
                               }) => {
    const [spinner, setSpinner] = React.useState(0);
    const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

    React.useEffect(() => {
        const interval = setInterval(() => {
            setSpinner(prev => (prev + 1) % spinners.length);
        }, 100);

        return () => clearInterval(interval);
    }, []);

    return (
        <Box>
            <Text color={color} bold>
                {spinners[spinner]} {message}
            </Text>
        </Box>
    );
};

// Connection status indicator
export const ConnectionStatus = ({
                                     isConnected,
                                     isConnecting = false,
                                     connectionUrl = null
                                 }) => {
    const [spinner, setSpinner] = React.useState(0);
    const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

    React.useEffect(() => {
        if (isConnecting) {
            const interval = setInterval(() => {
                setSpinner(prev => (prev + 1) % spinners.length);
            }, 100);

            return () => clearInterval(interval);
        }
    }, [isConnecting]);

    if (isConnecting) {
        return (
            <Box>
                <Text color={theme.colors.warning}>
                    {spinners[spinner]} Connecting...
                </Text>
            </Box>
        );
    }

    if (isConnected) {
        return (
            <Box>
                <Text color={theme.colors.success}>🟢 Connected</Text>
                {connectionUrl && (
                    <Text color={theme.colors.textMuted} marginLeft={1}>
                        ({connectionUrl})
                    </Text>
                )}
            </Box>
        );
    }

    return (
        <Box>
            <Text color={theme.colors.error}>🔴 Disconnected</Text>
        </Box>
    );
};

// Data loading wrapper component
export const withLoadingState = (Component, loadingComponent = StatusSkeleton) => {
    return function WithLoadingComponent({isLoading, ...props}) {
        if (isLoading) {
            return React.createElement(loadingComponent);
        }
        return React.createElement(Component, props);
    };
};

// Enhanced loading state with progress
export const LoadingProgress = ({
                                    message = "Loading...",
                                    progress = 0,
                                    max = 100,
                                    showPercentage = true
                                }) => (
    <Card variant="info" padding={theme.spacing.sm}>
        <Box flexDirection="column">
            <Box marginBottom={theme.spacing.xs}>
                <LoadingSpinner message={message}/>
            </Box>
            <ProgressBar
                progress={progress}
                max={max}
                width={30}
                color={theme.colors.primary}
                showPercentage={showPercentage}
            />
        </Box>
    </Card>
);