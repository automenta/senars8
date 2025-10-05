import React from 'react';
import {Box, Text} from 'ink';
import {theme} from '../theme.js';
import {Card} from './Interactive.jsx';

// Error Boundary component for graceful error handling
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {hasError: false, error: null, errorInfo: null};
    }

    static getDerivedStateFromError(error) {
        return {hasError: true};
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // Log error for debugging
        console.error('TUI Error:', error);
        console.error('Error Info:', errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Card variant="error" padding={theme.spacing.md}>
                    <Box flexDirection="column">
                        <Text color={theme.colors.error} bold>
                            🚨 TUI Error
                        </Text>
                        <Box marginTop={theme.spacing.sm}>
                            <Text color={theme.colors.text}>
                                Something went wrong in the TUI interface.
                            </Text>
                        </Box>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <Box marginTop={theme.spacing.sm}>
                                <Text color={theme.colors.textMuted} dimColor>
                                    Error: {this.state.error.message}
                                </Text>
                            </Box>
                        )}
                        <Box marginTop={theme.spacing.sm}>
                            <Text color={theme.colors.textMuted}>
                                Please restart the TUI or contact support if the problem persists.
                            </Text>
                        </Box>
                    </Box>
                </Card>
            );
        }

        return this.props.children;
    }
}

// Hook-based error boundary for functional components
export const withErrorBoundary = (Component, fallback = null) => {
    return function WithErrorBoundaryComponent(props) {
        return (
            <ErrorBoundary>
                <Component {...props} />
            </ErrorBoundary>
        );
    };
};

// Error fallback component for specific sections
export const ErrorFallback = ({
                                  error,
                                  resetError,
                                  title = "Section Error"
                              }) => (
    <Card variant="error" padding={theme.spacing.sm}>
        <Box flexDirection="column">
            <Text color={theme.colors.error} bold>
                ⚠️ {title}
            </Text>
            <Box marginTop={theme.spacing.xs}>
                <Text color={theme.colors.textMuted}>
                    {error?.message || 'An error occurred in this section'}
                </Text>
            </Box>
            {resetError && (
                <Box marginTop={theme.spacing.sm}>
                    <Text color={theme.colors.primary} dimColor>
                        Press R to retry
                    </Text>
                </Box>
            )}
        </Box>
    </Card>
);