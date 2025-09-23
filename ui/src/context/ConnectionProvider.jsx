import React, {createContext, useEffect, useState, useContext, useCallback} from 'react';
import agentService from '../services/agentService';

export const ConnectionContext = createContext(null);

export function ConnectionProvider({children}) {
    const [isConnected, setIsConnected] = useState(agentService.isConnected);
    const [lastMessage, setLastMessage] = useState(null);

    useEffect(() => {
        const handleStatusChange = (status) => {
            setIsConnected(status === 'connected');
        };

        const handleMessage = (message) => {
            setLastMessage(message);
        };

        agentService.on('status', handleStatusChange);
        agentService.on('message', handleMessage);

        // Set initial state
        setIsConnected(agentService.isConnected);

        return () => {
            agentService.off('status', handleStatusChange);
            agentService.off('message', handleMessage);
        };
    }, []);

    const sendMessage = useCallback((type, payload) => {
        agentService.sendMessage(type, payload);
    }, []);

    const value = {
        isConnected,
        sendMessage,
        lastMessage,
    };

    return (
        <ConnectionContext.Provider value={value}>
            {children}
        </ConnectionContext.Provider>
    );
}

export const useConnection = () => useContext(ConnectionContext);
