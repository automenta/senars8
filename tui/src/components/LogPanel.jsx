import React from 'react';
import {Box, Text} from 'ink';
import PropTypes from 'prop-types';
import {useLogs} from '@senars/common';
import {LogView} from '../TuiRenderer.jsx';

const LogPanel = ({agentService}) => {
    const logs = useLogs(agentService);

    return (
        <Box flexDirection="column" borderStyle="single" padding={1}>
            <LogView logs={logs} />
        </Box>
    );
};

LogPanel.propTypes = {
    agentService: PropTypes.object.isRequired,
};

export default LogPanel;