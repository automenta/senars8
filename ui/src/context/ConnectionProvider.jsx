import React, {useEffect, useState} from 'react';
import agentService from '../services/agentService';
import ConnectionContext from './ConnectionContext';

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