import React, {useState} from 'react';
import {Box, Text} from 'ink';
import PropTypes from 'prop-types';
import {useLogs} from '@senars/common';

const LogPanel = ({agentService}) => {
    const logs = useLogs(agentService);
    const [filterText, setFilterText] = useState('');
    const [showFilterInput, setShowFilterInput] = useState(false);

    const handleKeyPress = (key) => {
        if (showFilterInput) {
            if (key === 'Enter') {
                setShowFilterInput(false);
            } else if (key === 'Escape') {
                setFilterText('');
                setShowFilterInput(false);
            }
            return;
        }

        if (key === 'f' || key === 'F') {
            setShowFilterInput(true);
        }
    };

    const filteredLogs = filterText
        ? logs.filter(log => log.toLowerCase().includes(filterText.toLowerCase()))
        : logs;

    return (
        <Box flexDirection="column" borderStyle="single" padding={1}>
            <Box marginBottom={1}>
                <Text bold>Agent Logs</Text>
                <Text color="gray" marginLeft={2}>
                    (F: filter, Esc: back)
                </Text>
            </Box>

            {showFilterInput ? (
                <Box marginBottom={1}>
                    <Text color="cyan">Filter: </Text>
                    <Text color="yellow">
                        {filterText || 'Enter filter text... (Enter to apply, Esc to cancel)'}
                    </Text>
                </Box>
            ) : (
                <Box marginBottom={1}>
                    <Text color="gray">
                        {filterText ? `Filtered: "${filterText}" (${filteredLogs.length} logs)` : `${logs.length} logs`}
                    </Text>
                </Box>
            )}

            <Box flexDirection="column" flexGrow={1}>
                {filteredLogs.length === 0 ? (
                    <Text color="gray">
                        {logs.length === 0 ? 'No logs yet...' : 'No logs match filter'}
                    </Text>
                ) : (
                    filteredLogs.slice(-20).map((log, index) => (
                        <Text key={index} color="white">
                            {log}
                        </Text>
                    ))
                )}
            </Box>
        </Box>
    );
};

LogPanel.propTypes = {
    agentService: PropTypes.object.isRequired,
};

export default LogPanel;