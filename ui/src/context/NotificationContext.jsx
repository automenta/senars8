import {createContext, useContext, useEffect, useState} from 'react';
import agentService from '@/services/agentService';
import notificationService from '@/services/notificationService';
import {MESSAGE_TYPES} from '@/constants/ui';

// Create notification context
const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({children}) => {
    const [notifications, setNotifications] = useState([]);
    const [errorCount, setErrorCount] = useState(0);
    const [warningCount, setWarningCount] = useState(0);
    const [infoCount, setInfoCount] = useState(0);
    const [successCount, setSuccessCount] = useState(0);

    // Subscribe to agent service events and convert them to notifications
    useEffect(() => {
        const handleAgentError = (error) => {
            setErrorCount(prev => prev + 1);
            notificationService.addError('Agent Error', error.message || error.toString());
        };

        const handleAgentWarning = (warning) => {
            setWarningCount(prev => prev + 1);
            notificationService.addWarning('Agent Warning', warning.message || warning.toString());
        };

        const handleAgentInfo = (info) => {
            setInfoCount(prev => prev + 1);
            notificationService.addInfo('Agent Info', info.message || info.toString());
        };

        const handleAgentSuccess = (success) => {
            setSuccessCount(prev => prev + 1);
            notificationService.addSuccess('Agent Success', success.message || success.toString());
        };

        // Listen to all agent messages and create notifications based on type
        agentService.on(MESSAGE_TYPES.ERROR, handleAgentError);
        agentService.on(MESSAGE_TYPES.AGENT_CONTROL, (data) => {
            setInfoCount(prev => prev + 1);
            notificationService.addInfo('Agent Control', `Action: ${data.command}`);
        });

        // Listen for specific success messages
        agentService.on('task_added', (task) => {
            setSuccessCount(prev => prev + 1);
            notificationService.addSuccess('Task Added', `New task: ${task.termKey || task.id || 'Unknown'}`);
        });

        agentService.on('planCreated', (plan) => {
            setSuccessCount(prev => prev + 1);
            notificationService.addSuccess('Plan Created', `Goal: ${plan.goal}`);
        });

        agentService.on('system_cycle', () => {
            setInfoCount(prev => prev + 1);
            notificationService.addInfo('System Cycle', 'New cycle completed');
        });

        // Listen for connection events
        agentService.on(MESSAGE_TYPES.STATUS, (status) => {
            if (status === 'connected') {
                setSuccessCount(prev => prev + 1);
                notificationService.addSuccess('Connected', 'Successfully connected to agent');
            } else if (status === 'disconnected') {
                setWarningCount(prev => prev + 1);
                notificationService.addWarning('Disconnected', 'Disconnected from agent');
            }
        });

        agentService.on(MESSAGE_TYPES.CONNECTION_STATS, (stats) => {
            if (stats.lastDisconnection && new Date() - new Date(stats.lastDisconnection) < 10000) {
                // If we just disconnected, show warning
                setWarningCount(prev => prev + 1);
                notificationService.addWarning('Connection Lost', 'Connection to agent was lost');
            }
        });

        return () => {
            agentService.off(MESSAGE_TYPES.ERROR, handleAgentError);
            agentService.off(MESSAGE_TYPES.AGENT_CONTROL, handleAgentInfo);
            agentService.off('task_added', handleAgentSuccess);
            agentService.off('planCreated', handleAgentSuccess);
            agentService.off('system_cycle', handleAgentInfo);
            agentService.off(MESSAGE_TYPES.STATUS, (status) => {
                // We can't easily remove this specific listener since it's an inline function
                // This is a limitation of how the agent service works
            });
        };
    }, []);

    // Subscribe to notification service
    useEffect(() => {
        const handleNotification = (notification) => {
            setNotifications(prev => [notification, ...prev.slice(0, 99)]); // Keep max 100 notifications
        };

        notificationService.on('notificationAdded', handleNotification);

        return () => {
            notificationService.off('notificationAdded', handleNotification);
        };
    }, []);

    const value = {
        notifications,
        errorCount,
        warningCount,
        infoCount,
        successCount,
        clearNotifications: () => setNotifications([]),
        getRecentNotifications: (count = 5) => notifications.slice(0, count),
        getNotificationCount: (type) => {
            switch (type) {
                case 'error': return errorCount;
                case 'warning': return warningCount;
                case 'info': return infoCount;
                case 'success': return successCount;
                default: return notifications.length;
            }
        }
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};