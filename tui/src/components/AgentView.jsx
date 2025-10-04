import React, {useState} from 'react';
import {Box, Text} from 'ink';
import PropTypes from 'prop-types';
import StatusPanel from './StatusPanel.jsx';
import LogPanel from './LogPanel.jsx';

const AgentView = ({agentService}) => {
    const [activeTab, setActiveTab] = useState('status');

    return (
        <Box flexDirection="column" borderStyle="single" width="100%">
            <Box>
                <Box marginRight={2}>
                    <Text
                        onPress={() => setActiveTab('status')}
                        color={activeTab === 'status' ? 'green' : 'white'}
                        bold={activeTab === 'status'}
                    >
                        Status
                    </Text>
                </Box>
                <Box>
                    <Text
                        onPress={() => setActiveTab('log')}
                        color={activeTab === 'log' ? 'green' : 'white'}
                        bold={activeTab === 'log'}
                    >
                        Log
                    </Text>
                </Box>
            </Box>

            <Box marginTop={1}>
                {activeTab === 'status' && <StatusPanel agentService={agentService}/>}
                {activeTab === 'log' && <LogPanel agentService={agentService}/>}
            </Box>
        </Box>
    );
};

AgentView.propTypes = {
    agentService: PropTypes.object.isRequired,
};

export default AgentView;