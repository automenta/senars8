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

    // Show loading state if no data yet
    if (!agentState || Object.keys(agentState).length === 0) {
        return (
            <Card variant="warning" padding={theme.spacing.md}>
                <Flex flexDirection="column" alignItems="center">
                    <Text color={theme.colors.warning}>⏳ Loading agent status...</Text>
                    <Text color={theme.colors.textMuted}>Waiting for agent to respond with system information.</Text>
                </Flex>
            </Card>
        );
    }

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