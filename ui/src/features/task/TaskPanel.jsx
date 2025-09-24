import React, {useState, useEffect} from 'react';
import { Panel } from '@/components';
import agentService from '@/services/agentService';
import {ListTodo, Play, Square, RotateCcw, Plus, Trash2} from 'lucide-react';
import './TaskPanel.css';

function TaskPanel() {
    const [tasks, setTasks] = useState([]);
    const [newTask, setNewTask] = useState('');
    const [isAddingTask, setIsAddingTask] = useState(false);

    useEffect(() => {
        const handleTaskAdded = (task) => {
            setTasks(prev => [...prev, task]);
        };

        const handlePlanCreated = (planData) => {
            const {goal, plan} = planData;
            const task = {
                id: Date.now(),
                goal,
                plan,
                status: 'planned',
                createdAt: new Date().toISOString()
            };
            setTasks(prev => [...prev, task]);
        };

        agentService.on('tasks.add', handleTaskAdded);
        agentService.on('planCreated', handlePlanCreated);

        return () => {
            agentService.off('tasks.add', handleTaskAdded);
            agentService.off('planCreated', handlePlanCreated);
        };
    }, []);

    const handleAddTask = () => {
        if (newTask.trim()) {
            // For now, we'll just send the task as Narsese input
            // In a more complete implementation, we would have a specific task creation API
            agentService.sendNarsese(newTask);
            setNewTask('');
            setIsAddingTask(false);
        }
    };

    const handleExecuteTask = (taskId) => {
        // In a more complete implementation, we would have a specific task execution API
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            agentService.sendNarsese(task.goal);
        }
    };

    const handleRemoveTask = (taskId) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
    };

    const handleClearAllTasks = () => {
        setTasks([]);
    };

    return (
        <Panel title={<><ListTodo size={18}/> Task Management</>}>
            <div className="task-panel">
                <div className="task-actions">
                    <button 
                        className="btn-primary"
                        onClick={() => setIsAddingTask(true)}
                        title="Add new task"
                    >
                        <Plus size={16}/> Add Task
                    </button>
                    <button 
                        className="btn-secondary"
                        onClick={handleClearAllTasks}
                        title="Clear all tasks"
                        disabled={tasks.length === 0}
                    >
                        <Trash2 size={16}/> Clear All
                    </button>
                </div>

                {isAddingTask && (
                    <div className="add-task-form">
                        <input
                            type="text"
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                            placeholder="Enter task goal in Narsese..."
                            autoFocus
                        />
                        <div className="form-actions">
                            <button onClick={handleAddTask} disabled={!newTask.trim()}>Add</button>
                            <button onClick={() => setIsAddingTask(false)}>Cancel</button>
                        </div>
                    </div>
                )}

                <div className="task-list">
                    {tasks.length === 0 ? (
                        <div className="empty-state">
                            No tasks yet. Add a task to get started.
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <div key={task.id} className="task-item">
                                <div className="task-header">
                                    <div className="task-goal">{task.goal}</div>
                                    <div className="task-status">{task.status || 'pending'}</div>
                                </div>
                                {task.plan && (
                                    <div className="task-plan">
                                        <strong>Plan:</strong> {task.plan.join(' → ')}
                                    </div>
                                )}
                                <div className="task-actions">
                                    <button 
                                        onClick={() => handleExecuteTask(task.id)}
                                        title="Execute task"
                                    >
                                        <Play size={14}/> Execute
                                    </button>
                                    <button 
                                        onClick={() => handleRemoveTask(task.id)}
                                        title="Remove task"
                                    >
                                        <Trash2 size={14}/> Remove
                                    </button>
                                </div>
                                <div className="task-timestamp">
                                    Created: {new Date(task.createdAt).toLocaleString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Panel>
    );
}

export default TaskPanel;