import React, {useEffect, useState, useCallback, useMemo} from 'react';
import agentService from '../services/agentService';
import log from '@/utils/logger';
import {ConnectionContext} from './ConnectionContext';

export function ConnectionProvider({children}) {
    const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'failed'
    const [lastMessage, setLastMessage] = useState(null);
    const [connectionError, setConnectionError] = useState(null);
    const [connectionStats, setConnectionStats] = useState(null);

    // Track message history to prevent infinite loops
    const [messageHistory, setMessageHistory] = useState([]);
    const MAX_MESSAGE_HISTORY = 50; // Limit to prevent excessive memory usage

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
            setMessageHistory(prev => {
                const newHistory = [...prev, { ...message, timestamp: Date.now() }];
                // Keep only the most recent messages
                return newHistory.slice(-MAX_MESSAGE_HISTORY);
            });
            
            setLastMessage(message);
        };

        const handleError = (error) => {
            setConnectionError(error);
            log.error('Agent service error:', error);
        };

        const handleConnectionStats = (stats) => {
            setConnectionStats(stats);
        };

        // Register event listeners
        agentService.on('status', handleStatusChange);
        agentService.on('message', handleMessage);
        agentService.on('error', handleError);
        agentService.on('connection_stats', handleConnectionStats);

        // Set initial state
        setConnectionStatus(agentService.isConnected ? 'connected' : 'disconnected');
        setConnectionStats(agentService.getConnectionStats ? agentService.getConnectionStats() : null);

        return () => {
            // Clean up event listeners
            agentService.off('status', handleStatusChange);
            agentService.off('message', handleMessage);
            agentService.off('error', handleError);
            agentService.off('connection_stats', handleConnectionStats);
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
        isConnected: connectionStatus === 'connected',
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
