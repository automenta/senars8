import React, {useEffect, useState, useSyncExternalStore} from 'react';
import agentService from '@/services/agentService';
import notificationService from '@/services/notificationService';
import Toast from './Toast';

const subscribeNotifications = (callback) => {
    notificationService.on('change', callback);
    return () => notificationService.off('change', callback);
};
const getNotificationsSnapshot = () => notificationService.getNotifications();


function StatusBar() {
    const notifications = useSyncExternalStore(subscribeNotifications, getNotificationsSnapshot);
    const [agentStatus, setAgentStatus] = useState('disconnected');

    useEffect(() => {
        const handleStatusChange = (status) => setAgentStatus(status);
        agentService.on('status', handleStatusChange);
        return () => agentService.off('status', handleStatusChange);
    }, []);

    const onDismiss = (id) => {
        notificationService.removeNotification(id);
    }

    return (
        <div className="statusbar">
            <div className="toast-container">
                {notifications.map(n => (
                    <Toast key={n.id} notification={n} onDismiss={onDismiss}/>
                ))}
            </div>
            <div className="agent-status">
                Agent Status: <span className={`status-${agentStatus}`}>{agentStatus}</span>
            </div>
        </div>
    );
}

export default StatusBar;
