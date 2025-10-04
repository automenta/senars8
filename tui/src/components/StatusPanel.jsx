import React from 'react';
import {Box, Text} from 'ink';
import PropTypes from 'prop-types';
import {useAgentState} from '@senars/common';
import {StatusView, StatsView, MemoryView, TasksView, BeliefsView, GoalsView} from '../TuiRenderer.jsx';

const StatusPanel = ({agentService}) => {
    const agentState = useAgentState(agentService);

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
                <TasksView tasks={agentState.tasks}/>
            </Box>
            <Box marginTop={1}>
                <BeliefsView beliefs={agentState.memory?.beliefs}/>
            </Box>
            <Box marginTop={1}>
                <GoalsView goals={agentState.memory?.goals}/>
            </Box>
        </Box>
    );
};

StatusPanel.propTypes = {
    agentService: PropTypes.object.isRequired,
};

export default StatusPanel;