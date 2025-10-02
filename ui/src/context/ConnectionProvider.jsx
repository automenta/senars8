import React, {useCallback, useEffect, useMemo, useState} from 'react';
import agentService from '../services/agentService';
import log from '@core/utils/logger.js';
import {ConnectionContext} from './ConnectionContext';
import {CONNECTION_STATUS, MESSAGE_TYPES, UI_CONSTANTS} from '@/constants/ui';

export function ConnectionProvider({children}) {
    const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.DISCONNECTED); // 'disconnected', 'connecting', 'connected', 'failed'
    const [lastMessage, setLastMessage] = useState(null);
    const [connectionError, setConnectionError] = useState(null);
    const [connectionStats, setConnectionStats] = useState(null);

    // Track message history to prevent infinite loops
    const [messageHistory, setMessageHistory] = useState([]);
    const MAX_MESSAGE_HISTORY = UI_CONSTANTS.UI.MAX_MESSAGE_HISTORY; // Limit to prevent excessive memory usage

    useEffect(() => {
        // Event handlers
        const handleStatusChange = (status) => {
            setConnectionStatus(status);
            if (status === 'connected') {
                setConnectionError(null);
            }
        };

        const handleMessage = (message) => {
            // Add message to history with timestamp to prevent infinite loops
            try {
                setMessageHistory(prev => {
                    // Validate message before adding to history
                    if (!message || typeof message !== 'object') {
                        log.warn('Invalid message format received, skipping add to history:', message);
                        return prev;
                    }

                    const newHistory = [...prev, {...message, timestamp: Date.now()}];
                    // Keep only the most recent messages
                    return newHistory.slice(-MAX_MESSAGE_HISTORY);
                });

                setLastMessage(message);
            } catch (error) {
                log.error('Error handling message:', error);
            }
        };

        const handleError = (error) => {
            setConnectionError(error);
            log.error('Agent service error:', error);
        };

        const handleConnectionStats = (stats) => {
            setConnectionStats(stats);
        };

        // Register event listeners
        agentService.on(MESSAGE_TYPES.STATUS, handleStatusChange);
        agentService.on(MESSAGE_TYPES.MESSAGE, handleMessage);
        agentService.on(MESSAGE_TYPES.ERROR, handleError);
        agentService.on(MESSAGE_TYPES.CONNECTION_STATS, handleConnectionStats);

        // Set initial state
        setConnectionStatus(agentService.isConnected ? CONNECTION_STATUS.CONNECTED : CONNECTION_STATUS.DISCONNECTED);
        setConnectionStats(agentService.getConnectionStats ? agentService.getConnectionStats() : null);

        // Check if agent service is already connected and update status if so
        if (agentService.isConnected !== undefined) {
            setConnectionStatus(agentService.isConnected ? CONNECTION_STATUS.CONNECTED : CONNECTION_STATUS.DISCONNECTED);
        }

        return () => {
            // Clean up event listeners
            agentService.off(MESSAGE_TYPES.STATUS, handleStatusChange);
            agentService.off(MESSAGE_TYPES.MESSAGE, handleMessage);
            agentService.off(MESSAGE_TYPES.ERROR, handleError);
            agentService.off(MESSAGE_TYPES.CONNECTION_STATS, handleConnectionStats);
        };
    }, []);

    // Memoized callback to avoid unnecessary re-renders
    const sendMessage = useCallback((type, payload, retries = 3) => {
        if (!type) {
            log.error('Message type is required');
            return false;
        }

        // Send message and handle retries if needed
        const success = agentService.sendMessage(type, payload);

        if (!success && retries > 0) {
            // If failed, schedule retry after a short delay with exponential backoff
            setTimeout(() => {
                log.warn(`Retrying message ${type}, attempts left: ${retries - 1}`);
                agentService.sendMessage(type, payload);
            }, 500 * (4 - retries)); // Exponential backoff: 500ms, 1000ms, 1500ms
        } else if (!success) {
            log.error(`Failed to send message ${type} after all retry attempts`);
        }

        return success;
    }, []);

    const reconnect = useCallback(() => {
        agentService.connect();
    }, []);

    // Memoize the context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        isConnected: connectionStatus === CONNECTION_STATUS.CONNECTED,
        connectionStatus,
        sendMessage,
        lastMessage,
        connectionError,
        connectionStats,
        messageHistory,
        reconnect
    }), [
        connectionStatus,
        sendMessage,
        lastMessage,
        connectionError,
        connectionStats,
        messageHistory,
        reconnect
    ]);

    return (
        <ConnectionContext.Provider value={value}>
            {children}
        </ConnectionContext.Provider>
    );
}
