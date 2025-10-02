import React, {useEffect, useState} from 'react';
import {Panel} from '@ui/components';
import agentService from '@/services/agentService';
import {formatCoreDataForUI} from '@/utils/coreIntegration';
import {Eye, ListTodo, MessageSquare, Plus, Zap} from 'lucide-react';
import './TaskPanel.css';

const NarseseTaskPanel = () => {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newTaskInput, setNewTaskInput] = useState('');
    const [newTaskPunctuation, setNewTaskPunctuation] = useState('.');
    const [filter, setFilter] = useState('all'); // 'all', 'belief', 'goal', 'question'
    const [error, setError] = useState('');

    // Load tasks from agent
    useEffect(() => {
        const fetchTasks = async () => {
            setIsLoading(true);
            try {
                // Request tasks from agent with a timeout promise
                const response = await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Timeout fetching tasks'));
                    }, 5000);

                    const handleMessage = (payload) => {
                        clearTimeout(timeout);
                        agentService.off('tasks_response', handleMessage);
                        resolve(payload);
                    };

                    agentService.on('tasks_response', handleMessage);
                    agentService.sendMessage('get_tasks', {});
                });

                if (response && Array.isArray(response.tasks)) {
                    const formattedTasks = response.tasks.map(task => formatCoreDataForUI(task));
                    setTasks(formattedTasks);
                }
            } catch (err) {
                setError(err.message);
                console.error('Error fetching tasks:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTasks();

        // Listen for real-time task updates
        const handleTaskAdded = (task) => {
            const formattedTask = formatCoreDataForUI(task);
            setTasks(prev => [...prev, formattedTask]);
        };

        const handleTaskUpdated = (task) => {
            const formattedTask = formatCoreDataForUI(task);
            setTasks(prev =>
                prev.map(t => t.id === formattedTask.id ? formattedTask : t)
            );
        };

        agentService.on('task_added', handleTaskAdded);
        agentService.on('task_updated', handleTaskUpdated);

        return () => {
            agentService.off('task_added', handleTaskAdded);
            agentService.off('task_updated', handleTaskUpdated);
        };
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!newTaskInput.trim()) {
            setError('Task statement is required');
            return;
        }

        // Validate punctuation
        if (!['.', '!', '?'].includes(newTaskPunctuation)) {
            setError('Task must end with . (belief), ! (goal), or ? (question)');
            return;
        }

        // Check if statement already ends with punctuation
        let taskStatement = newTaskInput.trim();
        if (!taskStatement.endsWith(newTaskPunctuation)) {
            taskStatement += newTaskPunctuation;
        }

        // Send to agent service
        const success = agentService.sendNarsese(taskStatement);

        if (success) {
            // Clear input after successful submission
            setNewTaskInput('');
        } else {
            setError('Failed to send task to agent');
        }
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'all') return true;
        if (filter === 'belief') return task.punctuation === '.';
        if (filter === 'goal') return task.punctuation === '!';
        if (filter === 'question') return task.punctuation === '?';
        return true;
    });

    // Get task counts by type
    const typeCounts = {
        belief: tasks.filter(t => t.punctuation === '.').length,
        goal: tasks.filter(t => t.punctuation === '!').length,
        question: tasks.filter(t => t.punctuation === '?').length
    };

    // Get priority color based on value
    const getPriorityColor = (priority) => {
        if (priority >= 0.7) return 'high';
        if (priority >= 0.3) return 'medium';
        return 'low';
    };

    // Get priority label
    const getPriorityLabel = (priority) => {
        if (priority >= 0.7) return 'High';
        if (priority >= 0.3) return 'Medium';
        return 'Low';
    };

    const getTaskTypeIcon = (punctuation) => {
        switch (punctuation) {
            case '.':
                return <Eye size={16} className="task-type-icon belief"/>;
            case '!':
                return <Zap size={16} className="task-type-icon goal"/>;
            case '?':
                return <MessageSquare size={16} className="task-type-icon question"/>;
            default:
                return <ListTodo size={16} className="task-type-icon unknown"/>;
        }
    };

    return (
        <Panel title={<><ListTodo size={18}/> NARS Tasks</>}>
            <div className="task-panel">
                {/* Task Stats */}
                <div className="task-stats">
                    <div className="stat-card">
                        {getTaskTypeIcon('.')}
                        <span className="stat-number">{typeCounts.belief}</span>
                        <span className="stat-label">Beliefs</span>
                    </div>
                    <div className="stat-card">
                        {getTaskTypeIcon('!')}
                        <span className="stat-number">{typeCounts.goal}</span>
                        <span className="stat-label">Goals</span>
                    </div>
                    <div className="stat-card">
                        {getTaskTypeIcon('?')}
                        <span className="stat-number">{typeCounts.question}</span>
                        <span className="stat-label">Questions</span>
                    </div>
                </div>

                {/* Add Task Form */}
                <form onSubmit={handleSubmit} className="add-task-form">
                    <div className="input-group">
                        <input
                            type="text"
                            value={newTaskInput}
                            onChange={(e) => setNewTaskInput(e.target.value)}
                            placeholder="Enter Narsese task (e.g., (cat --> animal).)"
                            className="task-title-input"
                            maxLength={500}
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="task-punctuation" className="input-label">Task Type:</label>
                        <select
                            id="task-punctuation"
                            value={newTaskPunctuation}
                            onChange={(e) => setNewTaskPunctuation(e.target.value)}
                            className="task-punctuation-select"
                        >
                            <option value=".">Belief (.)</option>
                            <option value="!">Goal (!)</option>
                            <option value="?">Question (?)</option>
                        </select>
                    </div>
                    <button type="submit" className="add-task-btn">
                        <Plus size={16}/> Add NARS Task
                    </button>
                </form>

                {error && (
                    <div className="error-message">
                        <span className="error-text">{error}</span>
                    </div>
                )}

                {/* Filter Controls */}
                <div className="filter-controls">
                    <button
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </button>
                    <button
                        className={`filter-btn ${filter === 'belief' ? 'active' : ''}`}
                        onClick={() => setFilter('belief')}
                    >
                        Beliefs
                    </button>
                    <button
                        className={`filter-btn ${filter === 'goal' ? 'active' : ''}`}
                        onClick={() => setFilter('goal')}
                    >
                        Goals
                    </button>
                    <button
                        className={`filter-btn ${filter === 'question' ? 'active' : ''}`}
                        onClick={() => setFilter('question')}
                    >
                        Questions
                    </button>
                </div>

                {/* Task List */}
                <div className="task-list">
                    {isLoading ? (
                        <div className="loading">
                            Loading NARS tasks...
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="no-tasks">
                            {filter === 'all'
                                ? 'No NARS tasks yet. Add a new task to get started.'
                                : `No ${filter} tasks.`}
                        </div>
                    ) : (
                        filteredTasks.map((task, index) => (
                            <div key={task.id || index} className="task-item">
                                <div className="task-content">
                                    <div className="task-header">
                                        <div className="task-type-icon">
                                            {getTaskTypeIcon(task.punctuation)}
                                        </div>
                                        <h4 className="task-title">{task.statement}</h4>
                                    </div>

                                    <div className="task-meta">
                                        <div className="task-details">
                                            <div className="meta-row">
                                                <span className="meta-label">Type:</span>
                                                <span className="meta-value">
                                                    {task.punctuation === '.' ? 'Belief' :
                                                        task.punctuation === '!' ? 'Goal' :
                                                            task.punctuation === '?' ? 'Question' : 'Unknown'}
                                                </span>
                                            </div>
                                            <div className="meta-row">
                                                <span className="meta-label">Priority:</span>
                                                <span className={`priority-badge ${getPriorityColor(task.priority)}`}>
                                                    {getPriorityLabel(task.priority)} ({task.priority?.toFixed(3)})
                                                </span>
                                            </div>
                                            {task.truthValue && (
                                                <div className="meta-row">
                                                    <span className="meta-label">Truth:</span>
                                                    <span className="meta-value">
                                                        F: {task.truthValue.frequency?.toFixed(3)},
                                                        C: {task.truthValue.confidence?.toFixed(3)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Panel>
    );
};

export default NarseseTaskPanel;