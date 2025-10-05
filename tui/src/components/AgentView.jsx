// Define tabs outside component to prevent recreation
const TABS = [
    { id: 'status', label: '📊 Status', badge: 'live' },
    { id: 'tasks', label: '⚡ Tasks', badge: null },
    { id: 'log', label: '📝 Logs', badge: null },
    { id: 'input', label: '💬 Input', badge: null }
];

import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {Box, Text, useInput} from 'ink';
import PropTypes from 'prop-types';
import StatusPanel from './StatusPanel.jsx';
import LogPanel from './LogPanel.jsx';
import MessageInput from './MessageInput.jsx';
import TasksPanel from './TasksPanel.jsx';
import { theme } from '../theme.js';
import { Container, Panel, Flex } from './Layout.jsx';
import { TabBar, Button, Badge, Card } from './Interactive.jsx';
import { useTabNavigation } from '../hooks/useMouseInteraction.js';

const AgentView = ({agentService, globalFocusManager}) => {
    const [messageHistory, setMessageHistory] = useState([]);

    // Memoize tabs to prevent recreation
    const tabs = useMemo(() => TABS, []);

    const { activeTab, focusedTab, selectTab, nextTab, prevTab, focusNext, focusPrev } = useTabNavigation(tabs, 0);

    // Create stable tab selection handlers
    const handleTabSelect = useCallback((index) => {
        const tab = tabs[index];
        if (tab) {
            selectTab(tab.id);
        }
    }, [selectTab, tabs]);

    // Simplified focus registration - only register once
    React.useEffect(() => {
        if (globalFocusManager && tabs.length > 0) {
            tabs.forEach((tab, index) => {
                globalFocusManager.registerFocusable(`tab-${tab.id}`, {
                    type: 'tab',
                    index,
                    tabId: tab.id,
                    onFocus: () => handleTabSelect(index),
                    onActivate: () => handleTabSelect(index)
                });
            });
        }
    }, []); // Only run once on mount

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
        <Container flexDirection="column" width="100%">
            {/* Modern Tab Navigation */}
            <Card variant="primary" padding={theme.spacing.sm} marginBottom={theme.spacing.sm}>
                <Flex justifyContent="space-between" alignItems="center">
                    <TabBar
                        tabs={tabs}
                        activeTab={tabs.findIndex(tab => tab.id === activeTab)}
                        focusedTab={tabs.findIndex(tab => tab.id === activeTab)}
                        onTabChange={handleTabSelect}
                    />
                    <Flex gap={theme.spacing.sm}>
                        <Text color={theme.colors.textMuted}>
                            ←/→ arrows • H/L keys • 1-4 numbers
                        </Text>
                    </Flex>
                </Flex>
            </Card>

            {/* Modern Agent Control Panel */}
            <Card variant="success" padding={theme.spacing.md} marginBottom={theme.spacing.sm}>
                <Flex alignItems="center" gap={theme.spacing.md}>
                    <Text bold color={theme.colors.primary}>🤖 Agent Control:</Text>
                    <Button variant="success" onClick={() => handleAgentControl('start')}>
                        ▶️ Start
                    </Button>
                    <Button variant="warning" onClick={() => handleAgentControl('stop')}>
                        ⏹️ Stop
                    </Button>
                    <Button variant="error" onClick={() => handleAgentControl('reset')}>
                        🔄 Reset
                    </Button>
                </Flex>
            </Card>

            {/* Modern Tab Content with Enhanced Layout */}
            <Box flexGrow={1}>
                {activeTab === 'status' && (
                    <Panel title="📊 Agent Status" variant="primary">
                        <StatusPanel agentService={agentService}/>
                    </Panel>
                )}
                {activeTab === 'tasks' && (
                    <Panel title="⚡ Task Management" variant="warning">
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
                    </Panel>
                )}
                {activeTab === 'log' && (
                    <Panel title="📝 System Logs" variant="info">
                        <LogPanel agentService={agentService}/>
                    </Panel>
                )}
                {activeTab === 'input' && (
                    <Panel title="💬 Message Input" variant="secondary">
                        <MessageInput
                            agentService={agentService}
                            onMessageSent={handleMessageSent}
                            history={messageHistory}
                        />
                    </Panel>
                )}
            </Box>
        </Container>
    );
};

AgentView.propTypes = {
    agentService: PropTypes.object.isRequired,
};

export default AgentView;