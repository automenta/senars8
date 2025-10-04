import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import PropTypes from 'prop-types';

const AgentView = ({ agentService }) => {
    const [agentState, setAgentState] = useState(agentService.getAgentState());

    useEffect(() => {
        const handleStateUpdate = (newState) => {
            setAgentState(newState);
        };

        agentService.on('state_update', handleStateUpdate);

        return () => {
            agentService.off('state_update', handleStateUpdate);
        };
    }, [agentService]);

    return (
        <Box flexDirection="column" borderStyle="single" padding={1}>
            <Text>Status: {agentState.connectionStatus}</Text>
            <Text>Cycle: {agentState.cycleCount}</Text>
            <Box flexDirection="column" marginTop={1}>
                <Text bold>Tasks:</Text>
                {agentState.tasks.map((task, index) => (
                    <Text key={index}>- {JSON.stringify(task)}</Text>
                ))}
            </Box>
            <Box flexDirection="column" marginTop={1}>
                <Text bold>Beliefs:</Text>
                {agentState.beliefs.map((belief, index) => (
                    <Text key={index}>- {JSON.stringify(belief)}</Text>
                ))}
            </Box>
        </Box>
    );
};

AgentView.propTypes = {
    agentService: PropTypes.object.isRequired,
};

export default AgentView;