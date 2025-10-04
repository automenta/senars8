import React, { createContext, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { connectionManager, useAgentState } from '@senars/common';
import AgentService from '../services/agentService';

const AgentServiceContext = createContext(null);
const AgentStateContext = createContext(null);

export const useAgentService = () => {
    return useContext(AgentServiceContext);
};

export const useAgent = () => {
    return useContext(AgentStateContext);
};

export const AgentProvider = ({ children }) => {
    const agentService = useMemo(() => {
        // For now, we'll connect to a default URL.
        // This can be extended to use the connection discovery mechanism.
        const defaultUrl = `ws://localhost:${process.env.WS_PORT || 8080}`;
        connectionManager.connect(defaultUrl);
        return new AgentService(defaultUrl);
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