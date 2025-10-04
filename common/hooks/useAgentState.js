import {useEffect, useState} from 'react';

/**
 * A "headless" React hook to manage the state of an agent service.
 * It handles state updates and provides the latest agent state.
 *
 * @param {ApiService} agentService - An instance of ApiService or a compatible service.
 * @returns {object} The current state of the agent.
 */
const useAgentState = (agentService) => {
    const [agentState, setAgentState] = useState(agentService.getAgentState());

    useEffect(() => {
        const handleStateUpdate = (newState) => {
            setAgentState(newState);
        };

        // Subscribe to state updates
        agentService.on('state_update', handleStateUpdate);

        // Initial state sync
        handleStateUpdate(agentService.getAgentState());

        // Cleanup subscription on unmount
        return () => {
            agentService.off('state_update', handleStateUpdate);
        };
    }, [agentService]);

    return agentState;
};

export default useAgentState;