import React, {useCallback, useEffect, useState} from 'react';
import {Panel} from '@ui/components';
import agentService from '@/services/agentService';
import notificationService from '@/services/notificationService';
import {useUIErrorHandler} from '@/services/uiErrorHandler';
import {formatCoreDataForUI} from '@/utils/coreIntegration';
import {useConnection} from '@/context/useConnection';
import {Eye, List, Pause, Play, RotateCcw, Search, Zap} from 'lucide-react';
import './TaskInspectorPanel.css';

function TaskInspectorPanel() {
    const {handleError} = useUIErrorHandler('TaskInspectorPanel');
    const {isConnected} = useConnection();
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [filter, setFilter] = useState('');
    const [taskTypeFilter, setTaskTypeFilter] = useState('all'); // all, belief, goal, question
    const [priorityFilter, setPriorityFilter] = useState('all'); // all, high, medium, low
    const [isLoading, setIsLoading] = useState(false);

    // Fetch tasks from the agent
    const fetchTasks = useCallback(async () => {
        if (!isConnected) return;

        setIsLoading(true);
        try {
            // Request tasks from agent
            const response = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout fetching tasks'));
                }, 10000);

                const handleMessage = (payload) => {
                    clearTimeout(timeout);
                    agentService.off('tasks_response', handleMessage);
                    resolve(payload);
                };

                agentService.on('tasks_response', handleMessage);
                agentService.sendMessage('get_tasks', {
                    filter: taskTypeFilter,
                    priority: priorityFilter
                });
            });

            if (response && Array.isArray(response.tasks)) {
                const formattedTasks = response.tasks.map(task => formatCoreDataForUI(task));
                setTasks(formattedTasks);
            } else {
                setTasks([]);
            }
        } catch (error) {
            handleError(error, {
                operation: 'fetchTasks',
                filter: taskTypeFilter,
                priority: priorityFilter
            });
            setTasks([]);
        } finally {
            setIsLoading(false);
        }
    }, [isConnected, taskTypeFilter, priorityFilter, handleError]);

    // Apply filters to tasks
    useEffect(() => {
        let result = tasks;

        // Apply text filter
        if (filter) {
            result = result.filter(task =>
                task.statement.toLowerCase().includes(filter.toLowerCase()) ||
                (task.id && task.id.toLowerCase().includes(filter.toLowerCase()))
            );
        }

        // Apply type filter
        if (taskTypeFilter !== 'all') {
            result = result.filter(task => {
                if (taskTypeFilter === 'belief') return task.punctuation === '.';
                if (taskTypeFilter === 'goal') return task.punctuation === '!';
                if (taskTypeFilter === 'question') return task.punctuation === '?';
                return true;
            });
        }

        // Apply priority filter
        if (priorityFilter !== 'all') {
            result = result.filter(task => {
                if (priorityFilter === 'high') return task.priority >= 0.7;
                if (priorityFilter === 'medium') return task.priority >= 0.3 && task.priority < 0.7;
                if (priorityFilter === 'low') return task.priority < 0.3;
                return true;
            });
        }

        setFilteredTasks(result);
    }, [tasks, filter, taskTypeFilter, priorityFilter]);

    // Refresh tasks periodically
    useEffect(() => {
        if (isConnected) {
            fetchTasks();

            // Set up periodic refresh
            const interval = setInterval(() => {
                fetchTasks();
            }, 5000); // Refresh every 5 seconds

            return () => clearInterval(interval);
        }
    }, [isConnected, taskTypeFilter, priorityFilter, fetchTasks]);

    const handleTaskSelect = (task) => {
        setSelectedTask(task);
    };

    const handleTaskAction = (action, task) => {
        if (!isConnected) {
            notificationService.addError('Connection Error', 'Not connected to agent');
            return;
        }

        try {
            agentService.sendMessage('task_action', {
                action,
                taskId: task.id,
                task: task
            });

            notificationService.addInfo('Task Action', `Action '${action}' sent for task ${task.id}`);
        } catch (error) {
            handleError(error, {
                operation: 'taskAction',
                action,
                taskId: task.id
            });
        }
    };

    const handleRefresh = () => {
        fetchTasks();
    };

    const handleClearSelection = () => {
        setSelectedTask(null);
    };

    const getTaskTypeIcon = (punctuation) => {
        switch (punctuation) {
            case '.':
                return <Eye size={14} className="task-icon belief"/>;
            case '!':
                return <Zap size={14} className="task-icon goal"/>;
            case '?':
                return <Search size={14} className="task-icon question"/>;
            default:
                return <List size={14} className="task-icon unknown"/>;
        }
    };

    const getTaskPriorityLabel = (priority) => {
        if (priority >= 0.7) return 'High';
        if (priority >= 0.3) return 'Medium';
        return 'Low';
    };

    const getPriorityColor = (priority) => {
        if (priority >= 0.7) return 'high';
        if (priority >= 0.3) return 'medium';
        return 'low';
    };

    return (
        <Panel header={<><List size={18}/> Task Inspector</>}>
            <div className="task-inspector-panel">
                <div className="inspector-header">
                    <div className="filter-controls">
                        <div className="search-input-group">
                            <Search size={16} className="search-icon"/>
                            <input
                                type="text"
                                placeholder="Filter tasks..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="filter-input"
                            />
                        </div>

                        <select
                            value={taskTypeFilter}
                            onChange={(e) => setTaskTypeFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Types</option>
                            <option value="belief">Beliefs (.)</option>
                            <option value="goal">Goals (!)</option>
                            <option value="question">Questions (?)</option>
                        </select>

                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Priorities</option>
                            <option value="high">High Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="low">Low Priority</option>
                        </select>

                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="refresh-btn"
                            title="Refresh tasks"
                        >
                            <RotateCcw size={16}/> {isLoading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                <div className="inspector-content">
                    <div className="tasks-list-container">
                        <div className="tasks-list-header">
                            <h4>Tasks ({filteredTasks.length})</h4>
                        </div>

                        {isLoading ? (
                            <div className="loading-indicator">
                                Loading tasks...
                            </div>
                        ) : filteredTasks.length > 0 ? (
                            <div className="tasks-list">
                                {filteredTasks.map((task, index) => (
                                    <div
                                        key={index}
                                        className={`task-item ${selectedTask?.id === task.id ? 'selected' : ''}`}
                                        onClick={() => handleTaskSelect(task)}
                                    >
                                        <div className="task-header">
                                            <div className="task-type-icon">
                                                {getTaskTypeIcon(task.punctuation)}
                                            </div>
                                            <div className="task-statement">
                                                {task.statement}
                                            </div>
                                            <div className={`task-priority ${getPriorityColor(task.priority)}`}>
                                                {getTaskPriorityLabel(task.priority)}
                                            </div>
                                        </div>
                                        <div className="task-meta">
                                            <span className="task-id">ID: {task.id}</span>
                                            <span className="task-priority">P: {task.priority?.toFixed(3)}</span>
                                        </div>
                                        <div className="task-controls">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleTaskAction('execute', task);
                                                }}
                                                className="action-btn execute"
                                                title="Execute task"
                                            >
                                                <Play size={12}/>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleTaskAction('pause', task);
                                                }}
                                                className="action-btn pause"
                                                title="Pause task"
                                            >
                                                <Pause size={12}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-tasks">
                                <List size={48} className="no-tasks-icon"/>
                                <p>No tasks found</p>
                            </div>
                        )}
                    </div>

                    {selectedTask && (
                        <div className="task-details-container">
                            <div className="task-details-header">
                                <h4>Task Details</h4>
                                <button
                                    className="close-details-btn"
                                    onClick={handleClearSelection}
                                    title="Close details"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="task-details-content">
                                <div className="detail-item">
                                    <strong>ID:</strong>
                                    <span>{selectedTask.id}</span>
                                </div>

                                <div className="detail-item">
                                    <strong>Statement:</strong>
                                    <span className="statement-display">{selectedTask.statement}</span>
                                </div>

                                <div className="detail-item">
                                    <strong>Type:</strong>
                                    <span>
                                        {selectedTask.punctuation === '.' ? 'Belief' :
                                            selectedTask.punctuation === '!' ? 'Goal' :
                                                selectedTask.punctuation === '?' ? 'Question' : 'Unknown'}
                                        <span className="punctuation-mark"> {selectedTask.punctuation}</span>
                                    </span>
                                </div>

                                <div className="detail-item">
                                    <strong>Priority:</strong>
                                    <span className={`priority-value ${getPriorityColor(selectedTask.priority)}`}>
                                        {selectedTask.priority?.toFixed(3)} ({getTaskPriorityLabel(selectedTask.priority)})
                                    </span>
                                </div>

                                <div className="detail-item">
                                    <strong>Truth Value:</strong>
                                    <span>
                                        {selectedTask.truthValue ?
                                            `F: ${selectedTask.truthValue.frequency?.toFixed(3)},
                                             C: ${selectedTask.truthValue.confidence?.toFixed(3)}` :
                                            'N/A'}
                                    </span>
                                </div>

                                <div className="detail-item">
                                    <strong>Occurrence Time:</strong>
                                    <span>
                                        {selectedTask.occurrenceTime ?
                                            new Date(selectedTask.occurrenceTime).toLocaleString() :
                                            'N/A'}
                                    </span>
                                </div>

                                <div className="action-buttons">
                                    <button
                                        onClick={() => handleTaskAction('execute', selectedTask)}
                                        className="action-btn primary"
                                    >
                                        <Play size={16}/> Execute
                                    </button>
                                    <button
                                        onClick={() => handleTaskAction('pause', selectedTask)}
                                        className="action-btn secondary"
                                    >
                                        <Pause size={16}/> Pause
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {!selectedTask && filteredTasks.length === 0 && !isLoading && (
                    <div className="empty-state">
                        <List size={64} className="empty-state-icon"/>
                        <h3>No Tasks Found</h3>
                        <p>Try changing your filters or wait for new tasks to be generated</p>
                    </div>
                )}
            </div>
        </Panel>
    );
}

export default TaskInspectorPanel;