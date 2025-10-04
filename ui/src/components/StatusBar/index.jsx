import React, {useEffect, useState, useSyncExternalStore} from 'react';
import agentService from '@/services/agentService';
import notificationService from '@/services/notificationService';
import Toast from '../Toast';
import './style.css';

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

    // Filter notifications to only show temporary toast notifications (those with duration)
    const toastNotifications = notifications.filter(n => n.duration);

    return (
        <div className="statusbar" role="status">
            <div className="toast-container">
                {toastNotifications.map(n => (
                    <Toast key={n.id} notification={n} onDismiss={onDismiss}/>
                ))}
            </div>
            <div className={`agent-status status-${agentStatus}`} aria-live="polite">
                <span className={`agent-status-indicator ${agentStatus}`}></span>
                Agent: {agentStatus}
            </div>
        </div>
    );
}

StatusBar.propTypes = {};

export default StatusBar;