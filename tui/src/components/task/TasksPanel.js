import React, {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import {formatTaskForTUIDisplay, groupTasksByType} from '../../utils/coreIntegration.js';

const TasksPanel = ({agent}) => {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filter, setFilter] = useState('all'); // 'all', 'beliefs', 'goals', 'questions'

    useEffect(() => {
        if (!agent || !agent.apiService) return;

        // Set up event listeners for task updates
        const handleTaskAdded = (task) => {
            setTasks(prev => {
                // Check if task already exists
                const exists = prev.some(t => t.id === task.id || t.term === task.term);
                if (!exists) {
                    return [...prev, task];
                }
                return prev.map(t => t.id === task.id ? task : t);
            });
        };

        // Listen for task updates from the agent
        agent.apiService.on('task_added', handleTaskAdded);
        agent.apiService.on('tasks_response', (payload) => {
            if (payload && Array.isArray(payload.tasks)) {
                setTasks(payload.tasks);
            }
        });

        // Initial tasks fetch
        const fetchTasks = async () => {
            setIsLoading(true);
            try {
                await agent.apiService.sendMessage('get_tasks', {});
            } catch (error) {
                console.error('Error fetching tasks:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTasks();

        // Cleanup
        return () => {
            agent.apiService.off('task_added', handleTaskAdded);
            agent.apiService.off('tasks_response', handleTaskAdded);
        };
    }, [agent]);

    // Group tasks by type
    const {beliefs, goals, questions, other} = groupTasksByType(tasks);

    // Get tasks to display based on filter
    let displayTasks = tasks;
    switch (filter) {
        case 'beliefs':
            displayTasks = beliefs;
            break;
        case 'goals':
            displayTasks = goals;
            break;
        case 'questions':
            displayTasks = questions;
            break;
        case 'other':
            displayTasks = other;
            break;
        default:
            displayTasks = [...beliefs, ...goals, ...questions, ...other];
    }

    const taskCount = displayTasks.length;

    return React.createElement(Box, {flexDirection: "column", height: "100%"},
        React.createElement(Box, {flexDirection: "row", justifyContent: "space-between", marginBottom: 1},
            React.createElement(Text, {bold: true, color: "yellow"}, "Tasks"),
            React.createElement(Text, {color: "gray"}, `(${taskCount})`)
        ),
        React.createElement(Box, {flexDirection: "row", marginBottom: 1},
            React.createElement(Text, {
                color: filter === 'all' ? 'white' : 'gray',
                backgroundColor: filter === 'all' ? 'blue' : 'black'
            }, " ALL "),
            React.createElement(Text, {marginLeft: 1}),
            React.createElement(Text, {
                color: filter === 'beliefs' ? 'white' : 'green',
                backgroundColor: filter === 'beliefs' ? 'green' : 'black'
            }, " BELIEFS "),
            React.createElement(Text, {marginLeft: 1}),
            React.createElement(Text, {
                color: filter === 'goals' ? 'white' : 'red',
                backgroundColor: filter === 'goals' ? 'red' : 'black'
            }, " GOALS "),
            React.createElement(Text, {marginLeft: 1}),
            React.createElement(Text, {
                color: filter === 'questions' ? 'white' : 'yellow',
                backgroundColor: filter === 'questions' ? 'yellow' : 'black'
            }, " QUESTIONS ")
        ),
        React.createElement(Box, {flexDirection: "column", flexGrow: 1, marginTop: 1},
            ...(isLoading
                    ? [React.createElement(Text, {color: "gray"}, "Loading tasks...")]
                    : displayTasks.length === 0
                        ? [React.createElement(Text, {color: "gray"}, "No tasks to display")]
                        : displayTasks.slice(0, 10).map((task, index) => {  // Show first 10 tasks
                            const formatted = formatTaskForTUIDisplay(task);
                            if (!formatted) return null;

                            return React.createElement(Box, {key: index, flexDirection: "row", marginBottom: 1},
                                React.createElement(Text, {color: formatted.color},
                                    `${formatted.term} ${formatted.punctuation || '.'}`
                                )
                            );
                        })
            )
        )
    );
};

export default TasksPanel;