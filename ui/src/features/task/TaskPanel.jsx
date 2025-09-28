import React, {useState} from 'react';
import {Panel} from '@ui/components';
import {useTasks} from '@/context/TaskContext';
import {CheckCircle, Circle, Clock, ListTodo, Play, Plus, RotateCcw, Square, Trash2} from 'lucide-react';
import {uiFormatting} from '@common/index.js';
import './TaskPanel.css';

const TaskPanel = () => {
    const {tasks, isLoading, addTask, updateTask, deleteTask, completeTask, getTaskCountByStatus} = useTasks();
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [filter, setFilter] = useState('all'); // 'all', 'pending', 'inProgress', 'completed'

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newTaskTitle.trim()) {
            addTask({
                title: newTaskTitle.trim(),
                description: newTaskDesc.trim(),
                priority: 'medium', // default priority
            });
            setNewTaskTitle('');
            setNewTaskDesc('');
        }
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'all') return true;
        if (filter === 'pending') return task.status === 'pending';
        if (filter === 'inProgress') return task.status === 'inProgress';
        if (filter === 'completed') return task.status === 'completed';
        return true;
    });

    const statusCounts = getTaskCountByStatus();

    const updateTaskStatus = (taskId, newStatus) => {
        updateTask(taskId, {status: newStatus});
    };

    

    return (
        <Panel title={<><ListTodo size={18}/> Tasks</>}>
            <div className="task-panel">
                {/* Task Stats */}
                <div className="task-stats">
                    <div className="stat-card">
                        <Circle size={16} className="pending-icon"/>
                        <span className="stat-number">{statusCounts.pending}</span>
                        <span className="stat-label">Pending</span>
                    </div>
                    <div className="stat-card">
                        <Clock size={16} className="in-progress-icon"/>
                        <span className="stat-number">{statusCounts.inProgress}</span>
                        <span className="stat-label">In Progress</span>
                    </div>
                    <div className="stat-card">
                        <CheckCircle size={16} className="completed-icon"/>
                        <span className="stat-number">{statusCounts.completed}</span>
                        <span className="stat-label">Completed</span>
                    </div>
                </div>

                {/* Add Task Form */}
                <form onSubmit={handleSubmit} className="add-task-form">
                    <div className="input-group">
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Task title..."
                            className="task-title-input"
                            maxLength={100}
                        />
                    </div>
                    <div className="input-group">
                        <textarea
                            value={newTaskDesc}
                            onChange={(e) => setNewTaskDesc(e.target.value)}
                            placeholder="Task description (optional)..."
                            className="task-desc-input"
                            rows={2}
                            maxLength={500}
                        />
                    </div>
                    <button type="submit" className="add-task-btn">
                        <Plus size={16}/> Add Task
                    </button>
                </form>

                {/* Filter Controls */}
                <div className="filter-controls">
                    <button
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </button>
                    <button
                        className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                        onClick={() => setFilter('pending')}
                    >
                        Pending
                    </button>
                    <button
                        className={`filter-btn ${filter === 'inProgress' ? 'active' : ''}`}
                        onClick={() => setFilter('inProgress')}
                    >
                        In Progress
                    </button>
                    <button
                        className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
                        onClick={() => setFilter('completed')}
                    >
                        Completed
                    </button>
                </div>

                {/* Task List */}
                <div className="task-list">
                    {isLoading ? (
                        <div className="loading">
                            Loading tasks...
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="no-tasks">
                            {filter === 'all'
                                ? 'No tasks yet. Add a new task to get started.'
                                : `No ${filter} tasks.`}
                        </div>
                    ) : (
                        filteredTasks.map((task) => (
                            <div key={task.id} className="task-item">
                                <div className="task-content">
                                    <div className="task-header">
                                        <h4 className="task-title">{task.title}</h4>
                                        <div className="task-actions">
                                            {task.status !== 'completed' ? (
                                                <>
                                                    {task.status === 'pending' ? (
                                                        <button
                                                            onClick={() => updateTaskStatus(task.id, 'inProgress')}
                                                            className="action-btn start-btn"
                                                            title="Start task"
                                                        >
                                                            <Play size={14}/>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => updateTaskStatus(task.id, 'pending')}
                                                            className="action-btn pause-btn"
                                                            title="Pause task"
                                                        >
                                                            <Square size={14}/>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => completeTask(task.id)}
                                                        className="action-btn complete-btn"
                                                        title="Complete task"
                                                    >
                                                        <CheckCircle size={14}/>
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => updateTaskStatus(task.id, 'pending')}
                                                    className="action-btn restart-btn"
                                                    title="Restart task"
                                                >
                                                    <RotateCcw size={14}/>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteTask(task.id)}
                                                className="action-btn delete-btn"
                                                title="Delete task"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    </div>

                                    {task.description && (
                                        <p className="task-description">{task.description}</p>
                                    )}

                                    <div className="task-meta">
                                        <span className={`status-badge ${task.status}`}>
                                            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                        </span>
                                        <span className="task-date">
                                            Created: {uiFormatting.formatDate(task.createdAt)}
                                        </span>
                                        {task.completedAt && (
                                            <span className="task-date">
                                                Completed: {uiFormatting.formatDate(task.completedAt)}
                                            </span>
                                        )}
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

export default TaskPanel;