import React from 'react';
import {Box, Text, Static} from 'ink';
import PropTypes from 'prop-types';
import { theme } from './theme.js';
import { Badge, ProgressBar } from './components/Interactive.jsx';
import { Flex, Grid } from './components/Layout.jsx';

/**
 * Modern component for rendering agent status in the TUI
 */
export const StatusView = ({agentState}) => (
    <Box flexDirection="column">
        <Flex alignItems="center" marginBottom={theme.spacing.xs}>
            <Text bold color={theme.colors.primary}>🤖 Agent Status</Text>
            <Box marginLeft="auto">
                <Badge variant={agentState.isRunning ? 'success' : 'warning'}>
                    {agentState.isRunning ? '🟢 Running' : '🟡 Idle'}
                </Badge>
            </Box>
        </Flex>

        <Box marginBottom={theme.spacing.xs}>
            <Text color={theme.colors.text}>🔗 Connection: </Text>
            <Badge variant="info" marginLeft={1}>
                {agentState.connectionStatus}
            </Badge>
        </Box>

        <Box marginBottom={theme.spacing.xs}>
            <Text color={theme.colors.text}>🔄 Cycle: </Text>
            <Text color={theme.colors.secondary} bold marginLeft={1}>
                #{agentState.cycleCount}
            </Text>
        </Box>

        <Box>
            <Text color={theme.colors.text}>⏱️ Uptime: </Text>
            <Text color={theme.colors.textMuted} marginLeft={1}>
                {agentState.uptime}
            </Text>
        </Box>
    </Box>
);

StatusView.propTypes = {
    agentState: PropTypes.object.isRequired
};

/**
 * Modern component for rendering agent statistics in the TUI
 */
export const StatsView = ({agentState}) => (
    <Box flexDirection="column">
        <Text bold color={theme.colors.success}>📊 Performance Stats</Text>
        {agentState.stats && (
            <Box flexDirection="column" marginTop={theme.spacing.xs}>
                <Flex alignItems="center" marginBottom={theme.spacing.xs}>
                    <Text color={theme.colors.text}>⚡ Cycles/s: </Text>
                    <Text color={theme.colors.secondary} bold marginLeft={1}>
                        {agentState.stats.cyclesPerSecond}
                    </Text>
                </Flex>

                <Flex alignItems="center" marginBottom={theme.spacing.xs}>
                    <Text color={theme.colors.text}>🧠 Memory: </Text>
                    <Text color={theme.colors.info} bold marginLeft={1}>
                        {agentState.stats.memoryUsedMB}MB
                    </Text>
                </Flex>

                <Box marginBottom={theme.spacing.xs}>
                    <Text color={theme.colors.text} marginBottom={0}>💻 CPU Usage: </Text>
                    <ProgressBar
                        progress={agentState.stats.cpuUsage}
                        max={100}
                        width={15}
                        color={theme.colors.warning}
                        showPercentage={true}
                    />
                </Box>

                <Flex alignItems="center">
                    <Text color={theme.colors.text}>⚡ Tasks/s: </Text>
                    <Text color={theme.colors.accent} bold marginLeft={1}>
                        {agentState.stats.tasksPerSecond}
                    </Text>
                </Flex>
            </Box>
        )}
    </Box>
);

StatsView.propTypes = {
    agentState: PropTypes.object.isRequired
};

/**
 * Modern component for rendering agent memory in the TUI
 */
export const MemoryView = ({agentState}) => (
    <Box flexDirection="column">
        <Text bold color={theme.colors.info}>🧠 Knowledge Base</Text>
        {agentState.memory && (
            <Grid columns={3} gap={theme.spacing.sm} marginTop={theme.spacing.xs}>
                <Box alignItems="center">
                    <Text color={theme.colors.text}>💭 Beliefs</Text>
                    <Badge variant="primary" marginTop={0}>
                        {agentState.memory.beliefs?.length || 0}
                    </Badge>
                </Box>
                <Box alignItems="center">
                    <Text color={theme.colors.text}>🎯 Goals</Text>
                    <Badge variant="success" marginTop={0}>
                        {agentState.memory.goals?.length || 0}
                    </Badge>
                </Box>
                <Box alignItems="center">
                    <Text color={theme.colors.text}>💡 Concepts</Text>
                    <Badge variant="warning" marginTop={0}>
                        {agentState.memory.concepts?.length || 0}
                    </Badge>
                </Box>
            </Grid>
        )}
    </Box>
);

MemoryView.propTypes = {
    agentState: PropTypes.object.isRequired
};

/**
 * Modern component for rendering tasks in the TUI
 */
export const TasksView = ({tasks = []}) => (
    <Box flexDirection="column">
        <Flex alignItems="center" marginBottom={theme.spacing.xs}>
            <Text bold color={theme.colors.warning}>⚡ Active Tasks</Text>
            <Box marginLeft="auto">
                <Badge variant="warning">
                    {tasks.length}
                </Badge>
            </Box>
        </Flex>
        <Box flexDirection="column">
            {tasks.length === 0 ? (
                <Text color={theme.colors.textMuted}>No active tasks</Text>
            ) : (
                <Static items={tasks.slice(0, 5)}>
                    {(task, index) => (
                        <Flex key={index} alignItems="center" marginBottom={0}>
                            <Text color={theme.colors.accent}>•</Text>
                            <Text color={theme.colors.text} marginLeft={1}>
                                {task.termKey || task.statement || JSON.stringify(task)}
                            </Text>
                        </Flex>
                    )}
                </Static>
            )}
        </Box>
    </Box>
);

TasksView.propTypes = {
    tasks: PropTypes.array
};

/**
 * Modern component for rendering beliefs in the TUI
 */
export const BeliefsView = ({beliefs = []}) => (
    <Box flexDirection="column">
        <Flex alignItems="center" marginBottom={theme.spacing.xs}>
            <Text bold color={theme.colors.primary}>💭 Current Beliefs</Text>
            <Box marginLeft="auto">
                <Badge variant="primary">
                    {beliefs.length}
                </Badge>
            </Box>
        </Flex>
        <Box flexDirection="column">
            {beliefs.length === 0 ? (
                <Text color={theme.colors.textMuted}>No beliefs stored</Text>
            ) : (
                <Static items={beliefs.slice(0, 5)}>
                    {(belief, index) => (
                        <Flex key={index} alignItems="center" marginBottom={0}>
                            <Text color={theme.colors.info}>◇</Text>
                            <Text color={theme.colors.text} marginLeft={1}>
                                {belief.termKey || belief.statement || JSON.stringify(belief)}
                            </Text>
                        </Flex>
                    )}
                </Static>
            )}
        </Box>
    </Box>
);

BeliefsView.propTypes = {
    beliefs: PropTypes.array
};

/**
 * Modern component for rendering goals in the TUI
 */
export const GoalsView = ({goals = []}) => (
    <Box flexDirection="column">
        <Flex alignItems="center" marginBottom={theme.spacing.xs}>
            <Text bold color={theme.colors.success}>🎯 Active Goals</Text>
            <Box marginLeft="auto">
                <Badge variant="success">
                    {goals.length}
                </Badge>
            </Box>
        </Flex>
        <Box flexDirection="column">
            {goals.length === 0 ? (
                <Text color={theme.colors.textMuted}>No active goals</Text>
            ) : (
                <Static items={goals.slice(0, 5)}>
                    {(goal, index) => (
                        <Flex key={index} alignItems="center" marginBottom={0}>
                            <Text color={theme.colors.success}>▶</Text>
                            <Text color={theme.colors.text} marginLeft={1}>
                                {goal.termKey || goal.statement || JSON.stringify(goal)}
                            </Text>
                        </Flex>
                    )}
                </Static>
            )}
        </Box>
    </Box>
);

GoalsView.propTypes = {
    goals: PropTypes.array
};

/**
 * Functional component for rendering logs in the TUI
 */
export const LogView = ({logs = []}) => (
    <Box flexDirection="column">
        <Text bold>Recent Logs</Text>
        <Static items={logs.slice(-5)}>
            {(log, index) => (
                <Text key={index}>{log}</Text>
            )}
        </Static>
    </Box>
);

LogView.propTypes = {
    logs: PropTypes.array
};