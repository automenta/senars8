import React, {useState} from 'react';
import {Box, Text} from 'ink';
import PropTypes from 'prop-types';

const TasksPanel = ({tasks = [], onExecuteTask, onAddTask}) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTaskInput, setNewTaskInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchForm, setShowSearchForm] = useState(false);

    const handleKeyPress = (key) => {
        if (showAddForm) {
            if (key === 'Enter' && newTaskInput.trim()) {
                onAddTask?.(newTaskInput.trim());
                setNewTaskInput('');
                setShowAddForm(false);
            } else if (key === 'Escape') {
                setShowAddForm(false);
                setNewTaskInput('');
            }
            return;
        }

        if (showSearchForm) {
            if (key === 'Enter') {
                setShowSearchForm(false);
            } else if (key === 'Escape') {
                setSearchQuery('');
                setShowSearchForm(false);
            }
            return;
        }

        switch (key) {
            case 'ArrowUp':
                setSelectedIndex(prev => Math.max(0, prev - 1));
                break;
            case 'ArrowDown':
                setSelectedIndex(prev => Math.min(filteredTasks.length - 1, prev + 1));
                break;
            case 'Enter':
                if (filteredTasks[selectedIndex]) {
                    onExecuteTask?.(filteredTasks[selectedIndex]);
                }
                break;
            case 'a':
            case 'A':
                setShowAddForm(true);
                break;
            case 's':
            case 'S':
                setShowSearchForm(true);
                break;
            case 'Escape':
                setSelectedIndex(0);
                setSearchQuery('');
                break;
        }
    };

    // Filter tasks based on search query
    const filteredTasks = searchQuery
        ? tasks.filter(task => {
            const taskText = (task.termKey || task.statement || JSON.stringify(task)).toLowerCase();
            return taskText.includes(searchQuery.toLowerCase());
        })
        : tasks;

    const formatTask = (task, index) => {
        const isSelected = index === selectedIndex;
        const prefix = isSelected ? '▶ ' : '  ';
        const taskText = task.termKey || task.statement || JSON.stringify(task);

        return (
            <Box key={index}>
                <Text color={isSelected ? 'green' : 'white'}>
                    {prefix}{taskText}
                </Text>
                {isSelected && (
                    <Text color="gray" marginLeft={2}>
                        (Enter: execute, A: add task)
                    </Text>
                )}
            </Box>
        );
    };

    return (
        <Box flexDirection="column" borderStyle="single" padding={1}>
            <Box marginBottom={1}>
                <Text bold>Tasks</Text>
                <Text color="gray" marginLeft={2}>
                    (↑↓: navigate, Enter: execute, A: add, S: search, Esc: back)
                </Text>
            </Box>

            {showAddForm ? (
                <Box flexDirection="column" borderStyle="single" padding={1}>
                    <Text color="cyan">Add New Task:</Text>
                    <Text color="yellow">
                        {newTaskInput || 'Enter task statement... (Enter to add, Esc to cancel)'}
                    </Text>
                </Box>
            ) : showSearchForm ? (
                <Box flexDirection="column" borderStyle="single" padding={1}>
                    <Text color="cyan">Search Tasks:</Text>
                    <Text color="yellow">
                        {searchQuery || 'Enter search query... (Enter to search, Esc to cancel)'}
                    </Text>
                </Box>
            ) : (
                <Box flexDirection="column">
                    {searchQuery && (
                        <Box marginBottom={1}>
                            <Text color="gray">
                                Search: "{searchQuery}" ({filteredTasks.length} matches)
                            </Text>
                        </Box>
                    )}

                    {filteredTasks.length === 0 ? (
                        <Text color="gray">
                            {tasks.length === 0 ? 'No tasks available' : 'No tasks match search'}
                        </Text>
                    ) : (
                        filteredTasks.slice(0, 10).map((task, index) => formatTask(task, index))
                    )}

                    {filteredTasks.length > 10 && (
                        <Text color="gray" marginTop={1}>
                            ... and {filteredTasks.length - 10} more matching tasks
                        </Text>
                    )}
                </Box>
            )}
        </Box>
    );
};

TasksPanel.propTypes = {
    tasks: PropTypes.array,
    onExecuteTask: PropTypes.func,
    onAddTask: PropTypes.func,
};

export default TasksPanel;