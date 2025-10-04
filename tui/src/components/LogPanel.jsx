import React from 'react';
import {Box, Text} from 'ink';
import PropTypes from 'prop-types';
import {useLogs} from '@senars/common';

const LogPanel = ({agentService}) => {
    const logs = useLogs(agentService);

    return (
        <Box flexDirection="column" borderStyle="single" padding={1}>
            <Text bold>Logs:</Text>
            <Box flexDirection="column" marginTop={1}>
                {logs.map((log, index) => (
                    <Text key={index}>{log}</Text>
                ))}
            </Box>
        </Box>
    );
};

LogPanel.propTypes = {
    agentService: PropTypes.object.isRequired,
};

export default LogPanel;