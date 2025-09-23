import React, {createContext, useContext, useEffect, useState} from 'react';
import agentService from '../services/agentService';

export const ConnectionContext = createContext();

export function ConnectionProvider({children}) {
    const [isConnected, setIsConnected] = useState(agentService.isConnected);

    useEffect(() => {
        const handleStatusChange = (status) => {
            setIsConnected(status === 'connected');
        };

        agentService.on('status', handleStatusChange);

        // Set initial state
        setIsConnected(agentService.isConnected);

        return () => {
            agentService.off('status', handleStatusChange);
        };
    }, []);

    return (
        <ConnectionContext.Provider value={{isConnected}}>
            {children}
        </ConnectionContext.Provider>
    );
}

export function useConnection() {
    const context = useContext(ConnectionContext);
    if (context === undefined) {
        throw new Error('useConnection must be used within a ConnectionProvider');
    }
    return context;
}
