import React, {createContext, useEffect, useState, useContext, useCallback} from 'react';
import agentService from '../services/agentService';

export const ConnectionContext = createContext(null);

export function ConnectionProvider({children}) {
    const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'failed'
    const [lastMessage, setLastMessage] = useState(null);
    const [connectionError, setConnectionError] = useState(null);

    useEffect(() => {
        const handleStatusChange = (status) => {
            setConnectionStatus(status);
            if (status === 'connected') {
                setConnectionError(null);
            }
        };

        const handleMessage = (message) => {
            setLastMessage(message);
        };

        const handleError = (error) => {
            setConnectionError(error);
            console.error('Agent service error:', error);
        };

        agentService.on('status', handleStatusChange);
        agentService.on('message', handleMessage);
        agentService.on('error', handleError);

        // Set initial state
        setConnectionStatus(agentService.isConnected ? 'connected' : 'disconnected');

        return () => {
            agentService.off('status', handleStatusChange);
            agentService.off('message', handleMessage);
            agentService.off('error', handleError);
        };
    }, []);

    const sendMessage = useCallback((type, payload) => {
        return agentService.sendMessage(type, payload);
    }, []);

    const value = {
        isConnected: connectionStatus === 'connected',
        connectionStatus,
        sendMessage,
        lastMessage,
        connectionError,
        reconnect: () => {
            agentService.connect();
        }
    };

    return (
        <ConnectionContext.Provider value={value}>
            {children}
        </ConnectionContext.Provider>
    );
}

export const useConnection = () => useContext(ConnectionContext);
