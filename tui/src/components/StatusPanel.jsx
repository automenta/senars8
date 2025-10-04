import React from 'react';
import {Box, Text} from 'ink';
import PropTypes from 'prop-types';
import {useAgentState} from '@senars/common';
import {StatusView, StatsView, MemoryView, TasksView, BeliefsView, GoalsView} from '../TuiRenderer.jsx';

const StatusPanel = ({agentService}) => {
    const agentState = useAgentState(agentService);

    // Show loading state if no data yet
    if (!agentState || Object.keys(agentState).length === 0) {
        return (
            <Box flexDirection="column" padding={1} borderStyle="single">
                <Text color="yellow">Loading agent status...</Text>
                <Text color="gray">Waiting for agent to respond with system information.</Text>
            </Box>
        );
    }

    return (
        <Box flexDirection="column" padding={1} borderStyle="single">
            <StatusView agentState={agentState}/>
            <Box marginTop={1}>
                <StatsView agentState={agentState}/>
            </Box>
            <Box marginTop={1}>
                <MemoryView agentState={agentState}/>
            </Box>
            <Box marginTop={1}>
                <TasksView tasks={agentState.tasks || []}/>
            </Box>
            <Box marginTop={1}>
                <BeliefsView beliefs={agentState.beliefs || []}/>
            </Box>
            <Box marginTop={1}>
                <GoalsView goals={agentState.goals || []}/>
            </Box>
        </Box>
    );
};

StatusPanel.propTypes = {
    agentService: PropTypes.object.isRequired,
};

export default StatusPanel;