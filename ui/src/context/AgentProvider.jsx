import React, { createContext, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { connectionManager } from '@senars/common';
import AgentService from '../services/agentService';

const AgentContext = createContext(null);

export const useAgent = () => {
    return useContext(AgentContext);
};

export const AgentProvider = ({ children }) => {
    const agentService = useMemo(() => {
        // For now, we'll connect to a default URL.
        // This can be extended to use the connection discovery mechanism.
        const defaultUrl = 'ws://localhost:8080';
        connectionManager.connect(defaultUrl);
        return new AgentService(defaultUrl);
    }, []);

    return (
        <AgentContext.Provider value={agentService}>
            {children}
        </AgentContext.Provider>
    );
};

AgentProvider.propTypes = {
    children: PropTypes.node.isRequired,
};