import React from 'react';
import {Text} from 'ink';
import PropTypes from 'prop-types';
import {useAgentState} from '@senars/common';
import {BeliefsView, GoalsView, MemoryView, StatsView, StatusView, TasksView} from '../TuiRenderer.jsx';
import {theme} from '../theme.js';
import {Card} from './Interactive.jsx';
import {Flex, Grid} from './Layout.jsx';

const StatusPanel = ({agentService}) => {
    const agentState = useAgentState(agentService);

    // Use mock data if no real agent state is available
    const displayState = agentState || {
        isRunning: true,
        cycleCount: 1250,
        uptime: '00:12:34',
        version: '1.1.0',
        connectionStatus: 'connected',
        stats: {
            cyclesPerSecond: 10.5,
            memoryUsedMB: 45.2,
            cpuUsage: 23.7,
            tasksPerSecond: 2.1
        },
        memory: {
            beliefs: [
                {termKey: '(bird --> animal)', state: {truthValue: {confidence: 0.89}}},
                {termKey: '(animal --> living)', state: {truthValue: {confidence: 0.95}}}
            ],
            goals: [
                {termKey: 'food!', state: {truthValue: {confidence: 0.85}}}
            ],
            concepts: [{id: 'concept_1'}]
        },
        tasks: [
            {termKey: '(bird --> mortal)', punctuation: '.', state: {truthValue: {confidence: 0.65}}}
        ]
    };

    return (
        <Flex flexDirection="column" gap={theme.spacing.sm}>
            {/* Status Overview Cards */}
            <Grid columns={2} gap={theme.spacing.sm}>
                <Card variant="primary" padding={theme.spacing.sm}>
                    <StatusView agentState={agentState}/>
                </Card>
                <Card variant="success" padding={theme.spacing.sm}>
                    <StatsView agentState={agentState}/>
                </Card>
            </Grid>

            {/* Memory and Knowledge */}
            <Card variant="info" padding={theme.spacing.sm}>
                <MemoryView agentState={agentState}/>
            </Card>

            {/* Tasks and Goals */}
            <Grid columns={2} gap={theme.spacing.sm}>
                <Card variant="warning" padding={theme.spacing.sm}>
                    <TasksView tasks={agentState.tasks || []}/>
                </Card>
                <Card variant="secondary" padding={theme.spacing.sm}>
                    <GoalsView goals={agentState.goals || []}/>
                </Card>
            </Grid>

            {/* Beliefs */}
            <Card variant="primary" padding={theme.spacing.sm}>
                <BeliefsView beliefs={agentState.beliefs || []}/>
            </Card>
        </Flex>
    );
};

StatusPanel.propTypes = {
    agentService: PropTypes.object.isRequired,
};

export default StatusPanel;