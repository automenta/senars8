import React, {useState} from 'react';
import {Box, Text} from 'ink';
import PropTypes from 'prop-types';
import StatusPanel from './StatusPanel.jsx';
import LogPanel from './LogPanel.jsx';
import MessageInput from './MessageInput.jsx';
import TasksPanel from './TasksPanel.jsx';

const AgentView = ({agentService}) => {
    const [activeTab, setActiveTab] = useState('status');
    const [messageHistory, setMessageHistory] = useState([]);

    const handleMessageSent = (message) => {
        setMessageHistory(prev => [message, ...prev.slice(0, 49)]); // Keep last 50 messages
    };

    const handleAgentControl = (action) => {
        try {
            agentService.sendAgentControl(action);
        } catch (error) {
            console.error(`Failed to ${action} agent:`, error);
        }
    };

    return (
        <Box flexDirection="column" width="100%">
            {/* Tab Navigation */}
            <Box borderStyle="single" padding={1}>
                <Box marginRight={2}>
                    <Text
                        onPress={() => setActiveTab('status')}
                        color={activeTab === 'status' ? 'green' : 'white'}
                        bold={activeTab === 'status'}
                    >
                        Status
                    </Text>
                </Box>
                <Box marginRight={2}>
                    <Text
                        onPress={() => setActiveTab('tasks')}
                        color={activeTab === 'tasks' ? 'green' : 'white'}
                        bold={activeTab === 'tasks'}
                    >
                        Tasks
                    </Text>
                </Box>
                <Box marginRight={2}>
                    <Text
                        onPress={() => setActiveTab('log')}
                        color={activeTab === 'log' ? 'green' : 'white'}
                        bold={activeTab === 'log'}
                    >
                        Log
                    </Text>
                </Box>
                <Box marginRight={2}>
                    <Text
                        onPress={() => setActiveTab('input')}
                        color={activeTab === 'input' ? 'green' : 'white'}
                        bold={activeTab === 'input'}
                    >
                        Input
                    </Text>
                </Box>
            </Box>

            {/* Agent Control Buttons */}
            <Box borderStyle="single" padding={1} marginTop={1}>
                <Text bold>Agent Control: </Text>
                <Box marginLeft={2}>
                    <Text
                        onPress={() => handleAgentControl('start')}
                        color="green"
                        marginRight={2}
                    >
                        [Start]
                    </Text>
                    <Text
                        onPress={() => handleAgentControl('stop')}
                        color="red"
                        marginRight={2}
                    >
                        [Stop]
                    </Text>
                    <Text
                        onPress={() => handleAgentControl('reset')}
                        color="yellow"
                        marginRight={2}
                    >
                        [Reset]
                    </Text>
                </Box>
            </Box>

            {/* Tab Content */}
            <Box marginTop={1} flexGrow={1}>
                {activeTab === 'status' && <StatusPanel agentService={agentService}/>}
                {activeTab === 'tasks' && (
                    <TasksPanel
                        tasks={[]} // This should come from agent state
                        onExecuteTask={(task) => {
                            agentService.sendMessage('task_action', {action: 'execute', task});
                        }}
                        onAddTask={(taskStatement) => {
                            agentService.sendMessage('add_task', {
                                taskData: {
                                    statement: taskStatement,
                                    punctuation: '!',
                                    priority: 0.5
                                }
                            });
                        }}
                    />
                )}
                {activeTab === 'log' && <LogPanel agentService={agentService}/>}
                {activeTab === 'input' && (
                    <Box flexDirection="column">
                        <MessageInput
                            agentService={agentService}
                            onMessageSent={handleMessageSent}
                            history={messageHistory}
                        />
                    </Box>
                )}
            </Box>
        </Box>
    );
};

AgentView.propTypes = {
    agentService: PropTypes.object.isRequired,
};

export default AgentView;