import React, {useState, useEffect} from 'react';
import {Box, Text} from 'ink';
import PropTypes from 'prop-types';

const MessageInput = ({agentService, onMessageSent, history = [], disabled = false}) => {
    const [input, setInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const handleSubmit = async () => {
        if (!input.trim() || isSubmitting || disabled) return;

        setIsSubmitting(true);
        const message = input.trim();

        try {
            // Try to detect if it's Narsese or natural language
            if (message.includes('<') && message.includes('>')) {
                // Looks like Narsese
                agentService.sendNarsese(message);
            } else {
                // Treat as natural language
                agentService.sendNaturalLanguage(message);
            }

            setInput('');
            setHistoryIndex(-1);
            onMessageSent?.(message);
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyPress = (key) => {
        if (disabled) return;

        try {
            if (key === 'Enter') {
                handleSubmit();
            } else if (key === 'ArrowUp') {
                const newIndex = Math.min(historyIndex + 1, history.length - 1);
                if (newIndex >= 0 && history[newIndex]) {
                    setHistoryIndex(newIndex);
                    setInput(history[newIndex]);
                }
            } else if (key === 'ArrowDown') {
                const newIndex = Math.max(historyIndex - 1, -1);
                if (newIndex === -1) {
                    setHistoryIndex(-1);
                    setInput('');
                } else if (history[newIndex]) {
                    setHistoryIndex(newIndex);
                    setInput(history[newIndex]);
                }
            } else if (key === 'Escape') {
                setInput('');
                setHistoryIndex(-1);
            }
        } catch (error) {
            console.error('Error handling key event:', error);
        }
    };

    // Global keyboard shortcut handler
    useEffect(() => {
        if (disabled) return;

        // Note: In a real TUI, you might need to handle global shortcuts differently
        // This is a simplified version for the basic functionality
    }, [disabled]);

    const displayText = input || (isSubmitting ? 'Sending...' : 'Type your message... (Enter to send, ↑↓ for history, Esc to clear)');
    const color = disabled ? "gray" : (isSubmitting ? "yellow" : "white");

    return (
        <Box borderStyle="single" padding={1}>
            <Box marginRight={1}>
                <Text color="cyan" bold>Input:</Text>
            </Box>
            <Box flexGrow={1}>
                <Text
                    color={color}
                    wrap="wrap"
                >
                    {displayText}
                </Text>
            </Box>
        </Box>
    );
};

MessageInput.propTypes = {
    agentService: PropTypes.object.isRequired,
    onMessageSent: PropTypes.func,
    history: PropTypes.arrayOf(PropTypes.string),
    disabled: PropTypes.bool,
};

export default MessageInput;