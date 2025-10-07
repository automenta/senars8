import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import PropTypes from 'prop-types';
import {theme} from '../theme.js';
import {Card} from './Interactive.jsx';

const MessageInput = ({agentService, onMessageSent, history = [], disabled = false}) => {
    const [input, setInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Handle keyboard input for text entry
    useInput((inputChar, key) => {
        if (disabled || isSubmitting) return;

        if (key.return) {
            handleSubmit();
        } else if (key.escape) {
            setInput('');
            setHistoryIndex(-1);
        } else if (key.upArrow) {
            const newIndex = Math.min(historyIndex + 1, history.length - 1);
            if (newIndex >= 0 && history[newIndex]) {
                setHistoryIndex(newIndex);
                setInput(history[newIndex]);
            }
        } else if (key.downArrow) {
            const newIndex = Math.max(historyIndex - 1, -1);
            if (newIndex === -1) {
                setHistoryIndex(-1);
                setInput('');
            } else if (history[newIndex]) {
                setHistoryIndex(newIndex);
                setInput(history[newIndex]);
            }
        } else if (key.backspace || key.delete) {
            setInput(prev => prev.slice(0, -1));
        } else if (inputChar && inputChar.match(/[\x20-\x7E]/)) {
            // Printable ASCII characters
            setInput(prev => prev + inputChar);
        }
    });

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


    const displayText = input || (isSubmitting ? '📤 Sending message...' : '💬 Type your message... (Enter to send, ↑↓ for history, Esc to clear)');
    const color = disabled ? theme.colors.textMuted : (isSubmitting ? theme.colors.warning : theme.colors.text);

    return (
        <Card variant="secondary" padding={theme.spacing.md}>
            <Box flexDirection="column">
                <Text color={theme.colors.primary} bold>
                    💬 Message Input
                </Text>
                <Box marginTop={theme.spacing.sm}>
                    <Text color={color} wrap="wrap">
                        {displayText}
                    </Text>
                </Box>
            </Box>
        </Card>
    );
};

MessageInput.propTypes = {
    agentService: PropTypes.object.isRequired,
    onMessageSent: PropTypes.func,
    history: PropTypes.arrayOf(PropTypes.string),
    disabled: PropTypes.bool,
};

export default MessageInput;