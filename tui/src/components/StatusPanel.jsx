import React from 'react';
import {Box, Text} from 'ink';
import PropTypes from 'prop-types';
import {useAgentState} from '@senars/common';

const StatusPanel = ({agentService}) => {
    const agentState = useAgentState(agentService);

    return (
        <Box flexDirection="column" padding={1}>
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

StatusPanel.propTypes = {
    agentService: PropTypes.object.isRequired,
};

export default StatusPanel;