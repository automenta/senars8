import React, {createContext, useContext, useMemo} from 'react';
import PropTypes from 'prop-types';
import {connectionManager, useAgentState} from '@senars/common';
import AgentService from '../services/agentService';

const AgentServiceContext = createContext(null);
const AgentStateContext = createContext(null);

export const useAgentService = () => {
    return useContext(AgentServiceContext);
};

export const useAgent = () => {
    return useContext(AgentStateContext);
};

export const AgentProvider = ({children}) => {
    const agentService = useMemo(() => {
        // Use environment variables set by the integrated runner
        // VITE_WS_URL is set by the integrated web runner
        // WS_PORT is the fallback for direct connections
        const wsUrl = import.meta.env.VITE_WS_URL || `ws://localhost:${process.env.WS_PORT || 8081}`;

        console.log('Connecting to WebSocket:', wsUrl);
        connectionManager.connect(wsUrl);
        return new AgentService(wsUrl);
    }, []);

    const agentState = useAgentState(agentService);

    return (
        <AgentServiceContext.Provider value={agentService}>
            <AgentStateContext.Provider value={agentState}>
                {children}
            </AgentStateContext.Provider>
        </AgentServiceContext.Provider>
    );
};

AgentProvider.propTypes = {
    children: PropTypes.node.isRequired,
};