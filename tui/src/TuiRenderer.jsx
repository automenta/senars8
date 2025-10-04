import React from 'react';
import {Box, Text, Static} from 'ink';
import PropTypes from 'prop-types';

/**
 * Functional component for rendering agent status in the TUI
 */
export const StatusView = ({agentState}) => (
    <Box flexDirection="column">
        <Text bold>Agent Status</Text>
        <Text>Connection: {agentState.connectionStatus}</Text>
        <Text>Running: {agentState.isRunning ? 'Yes' : 'No'}</Text>
        <Text>Cycle: {agentState.cycleCount}</Text>
        <Text>Uptime: {agentState.uptime}</Text>
    </Box>
);

StatusView.propTypes = {
    agentState: PropTypes.object.isRequired
};

/**
 * Functional component for rendering agent statistics in the TUI
 */
export const StatsView = ({agentState}) => (
    <Box flexDirection="column">
        <Text bold>Statistics</Text>
        {agentState.stats && (
            <>
                <Text>Cycles/s: {agentState.stats.cyclesPerSecond}</Text>
                <Text>Memory (MB): {agentState.stats.memoryUsedMB}</Text>
                <Text>CPU (%): {agentState.stats.cpuUsage}</Text>
                <Text>Tasks/s: {agentState.stats.tasksPerSecond}</Text>
            </>
        )}
    </Box>
);

StatsView.propTypes = {
    agentState: PropTypes.object.isRequired
};

/**
 * Functional component for rendering agent memory in the TUI
 */
export const MemoryView = ({agentState}) => (
    <Box flexDirection="column">
        <Text bold>Memory</Text>
        {agentState.memory && (
            <>
                <Text>Beliefs: {agentState.memory.beliefs?.length || 0}</Text>
                <Text>Goals: {agentState.memory.goals?.length || 0}</Text>
                <Text>Concepts: {agentState.memory.concepts?.length || 0}</Text>
            </>
        )}
    </Box>
);

MemoryView.propTypes = {
    agentState: PropTypes.object.isRequired
};

/**
 * Functional component for rendering tasks in the TUI
 */
export const TasksView = ({tasks = []}) => (
    <Box flexDirection="column">
        <Text bold>Tasks</Text>
        <Static items={tasks.slice(0, 5)}>
            {(task, index) => (
                <Text key={index}>- {task.termKey || task.statement || JSON.stringify(task)}</Text>
            )}
        </Static>
    </Box>
);

TasksView.propTypes = {
    tasks: PropTypes.array
};

/**
 * Functional component for rendering beliefs in the TUI
 */
export const BeliefsView = ({beliefs = []}) => (
    <Box flexDirection="column">
        <Text bold>Beliefs</Text>
        <Static items={beliefs.slice(0, 5)}>
            {(belief, index) => (
                <Text key={index}>- {belief.termKey || belief.statement || JSON.stringify(belief)}</Text>
            )}
        </Static>
    </Box>
);

BeliefsView.propTypes = {
    beliefs: PropTypes.array
};

/**
 * Functional component for rendering goals in the TUI
 */
export const GoalsView = ({goals = []}) => (
    <Box flexDirection="column">
        <Text bold>Goals</Text>
        <Static items={goals.slice(0, 5)}>
            {(goal, index) => (
                <Text key={index}>- {goal.termKey || goal.statement || JSON.stringify(goal)}</Text>
            )}
        </Static>
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