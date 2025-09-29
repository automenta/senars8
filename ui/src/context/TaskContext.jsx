import {createContext, useCallback, useContext, useEffect, useState} from 'react';
import agentService from '@/services/agentService';

const TaskContext = createContext();

export const useTasks = () => {
    const context = useContext(TaskContext);
    if (!context) {
        throw new Error('useTasks must be used within a TaskProvider');
    }
    return context;
};

export const TaskProvider = ({children}) => {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const handleTaskUpdate = (taskData) => {
            if (taskData && Array.isArray(taskData)) {
                setTasks(prev => {
                    const existingTaskIds = new Map(prev.map(task => [task.id, task]));
                    const updatedTasks = [...prev];
                    taskData.forEach(newTask => {
                        if (existingTaskIds.has(newTask.id)) {
                            const index = updatedTasks.findIndex(t => t.id === newTask.id);
                            if (index !== -1) {
                                updatedTasks[index] = {...updatedTasks[index], ...newTask};
                            }
                        } else {
                            updatedTasks.push(newTask);
                        }
                    });
                    return updatedTasks;
                });
            } else if (taskData && taskData.id) {
                setTasks(prev => {
                    const existingIndex = prev.findIndex(t => t.id === taskData.id);
                    if (existingIndex !== -1) {
                        const updated = [...prev];
                        updated[existingIndex] = {...updated[existingIndex], ...taskData};
                        return updated;
                    } else {
                        return [...prev, taskData];
                    }
                });
            }
        };

        const handleTaskError = (error) => {
            console.error('Task error:', error);
        };

        agentService.on('task_update', handleTaskUpdate);
        agentService.on('task_error', handleTaskError);

        setIsLoading(true);
        agentService.sendMessage('get_tasks', {});

        return () => {
            agentService.off('task_update', handleTaskUpdate);
            agentService.off('task_error', handleTaskError);
        };
    }, []);

    const addTask = useCallback((taskData) => {
        const newTask = {
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...taskData,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setTasks(prev => [...prev, newTask]);
        if (agentService.isConnected) {
            agentService.sendMessage('add_task', newTask);
        }
        return newTask.id;
    }, []);

    const updateTask = useCallback((taskId, updates) => {
        setTasks(prev =>
            prev.map(task =>
                task.id === taskId
                    ? {...task, ...updates, updatedAt: new Date().toISOString()}
                    : task
            )
        );
        if (agentService.isConnected) {
            agentService.sendMessage('update_task', {taskId, updates});
        }
    }, []);

    const deleteTask = useCallback((taskId) => {
        setTasks(prev => prev.filter(task => task.id !== taskId));
        if (agentService.isConnected) {
            agentService.sendMessage('delete_task', {taskId});
        }
    }, []);

    const completeTask = useCallback((taskId) => {
        updateTask(taskId, {status: 'completed', completedAt: new Date().toISOString()});
    }, [updateTask]);

    const getTasksFromAgent = useCallback(() => {
        try {
            return agentService.getTasks();
        } catch (error) {
            console.error('Error getting tasks from agent:', error);
            return false;
        }
    }, []);

    const getTaskCountByStatus = useCallback(() => {
        return tasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {pending: 0, inProgress: 0, completed: 0});
    }, [tasks]);

    const value = {
        tasks,
        isLoading,
        addTask,
        updateTask,
        deleteTask,
        completeTask,
        getTaskCountByStatus,
        getTasksFromAgent,
    };

    return (
        <TaskContext.Provider value={value}>
            {children}
        </TaskContext.Provider>
    );
};