import React from 'react';
import {Box, Text} from 'ink';
import {theme} from '../theme.js';
import {Badge, Card} from './Interactive.jsx';
import {Flex} from './Layout.jsx';
import {formatShortcut} from '../utils/uiHelpers.js';

// Keyboard shortcuts documentation component
export const KeyboardShortcuts = ({
                                      shortcuts = [],
                                      title = "Keyboard Shortcuts",
                                      variant = "info"
                                  }) => (
    <Card variant={variant} padding={theme.spacing.sm}>
        <Box flexDirection="column">
            <Text bold color={theme.colors.primary}>
                ⌨️ {title}
            </Text>
            <Box marginTop={theme.spacing.xs}>
                {shortcuts.map((shortcut, index) => (
                    <Box key={index} marginBottom={theme.spacing.xs}>
                        <Box width={12}>
                            <Text color={theme.colors.textMuted}>
                                {shortcut.keys.map(formatShortcut).join(' + ')}
                            </Text>
                        </Box>
                        <Text color={theme.colors.text} marginLeft={2}>
                            {shortcut.description}
                        </Text>
                    </Box>
                ))}
            </Box>
        </Box>
    </Card>
);

// Default TUI shortcuts
export const defaultTuiShortcuts = [
    {
        keys: ['Ctrl', 'C'],
        description: 'Exit TUI'
    },
    {
        keys: ['1', '2', '3', '4'],
        description: 'Switch between tabs (Status, Tasks, Logs, Input)'
    },
    {
        keys: ['←', '→'],
        description: 'Navigate tabs (alternative to numbers)'
    },
    {
        keys: ['H', 'L'],
        description: 'Navigate tabs (vim-style)'
    },
    {
        keys: ['Enter'],
        description: 'Activate focused element'
    },
    {
        keys: ['Tab'],
        description: 'Navigate between focusable elements'
    },
    {
        keys: ['Esc'],
        description: 'Clear input / Cancel action'
    },
    {
        keys: ['↑', '↓'],
        description: 'Navigate input history'
    }
];

// Agent control shortcuts
export const agentControlShortcuts = [
    {
        keys: ['Ctrl', 'S'],
        description: 'Start agent'
    },
    {
        keys: ['Ctrl', 'T'],
        description: 'Stop agent'
    },
    {
        keys: ['Ctrl', 'R'],
        description: 'Reset agent'
    }
];

// Context-aware shortcuts display
export const ContextShortcuts = ({
                                     context = 'general',
                                     position = 'bottom'
                                 }) => {
    const contextShortcuts = {
        general: defaultTuiShortcuts,
        agent: agentControlShortcuts,
        input: [
            {
                keys: ['Enter'],
                description: 'Send message'
            },
            {
                keys: ['↑', '↓'],
                description: 'Browse history'
            },
            {
                keys: ['Esc'],
                description: 'Clear input'
            }
        ]
    };

    const shortcuts = contextShortcuts[context] || defaultTuiShortcuts;

    return (
        <Box marginTop={theme.spacing.sm}>
            <KeyboardShortcuts
                shortcuts={shortcuts}
                title={`${context.charAt(0).toUpperCase() + context.slice(1)} Shortcuts`}
                variant="primary"
            />
        </Box>
    );
};

// Help panel component
export const HelpPanel = ({isVisible, onClose}) => {
    if (!isVisible) return null;

    return (
        <Box position="absolute" marginTop={-2} marginLeft={2}>
            <Card variant="info" padding={theme.spacing.md}>
                <Box flexDirection="column">
                    <Flex justifyContent="space-between" alignItems="center" marginBottom={theme.spacing.sm}>
                        <Text bold color={theme.colors.primary}>🆘 Help & Shortcuts</Text>
                        <Text color={theme.colors.textMuted} dimColor>
                            Press F1 or ? to toggle
                        </Text>
                    </Flex>

                    <ContextShortcuts context="general"/>
                    <Box marginTop={theme.spacing.sm}>
                        <ContextShortcuts context="agent"/>
                    </Box>

                    <Box marginTop={theme.spacing.sm} marginBottom={theme.spacing.sm}>
                        <Text color={theme.colors.textMuted} dimColor>
                            💡 Tip: Use Tab to navigate, Enter to select, Esc to cancel
                        </Text>
                    </Box>

                    <Box>
                        <Badge variant="warning">Press any key to close</Badge>
                    </Box>
                </Box>
            </Card>
        </Box>
    );
};

// Accessibility announcements for screen readers
export const ScreenReaderAnnouncement = ({message, priority = 'polite'}) => {
    // In a real implementation, this would use aria-live regions
    // For now, we'll just log for debugging
    React.useEffect(() => {
        if (message) {
            console.log(`Screen Reader: ${message}`);
        }
    }, [message]);

    return null; // This component doesn't render anything visible
};

// Focus indicator for better accessibility
export const FocusIndicator = ({isFocused, children, label}) => (
    <Box>
        {isFocused && (
            <Box marginBottom={theme.spacing.xs}>
                <Badge variant="primary">
                    🔍 {label || 'Focused'}
                </Badge>
            </Box>
        )}
        {children}
    </Box>
);

// High contrast mode toggle
export const useHighContrast = () => {
    const [isHighContrast, setIsHighContrast] = React.useState(false);

    const toggleHighContrast = React.useCallback(() => {
        setIsHighContrast(prev => !prev);
    }, []);

    const highContrastColors = isHighContrast ? {
        background: '#000000',
        text: '#FFFFFF',
        primary: '#FFFF00',
        success: '#00FF00',
        warning: '#FF8000',
        error: '#FF0000',
        border: '#FFFFFF'
    } : theme.colors;

    return {
        isHighContrast,
        toggleHighContrast,
        colors: highContrastColors
    };
};