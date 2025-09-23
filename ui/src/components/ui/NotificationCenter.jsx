import React, {useSyncExternalStore} from 'react';
import notificationService from '@/services/notificationService';
import {Trash2} from 'lucide-react';

const subscribe = (callback) => {
    notificationService.on('change', callback);
    return () => {
        notificationService.off('change', callback);
    };
};

const getSnapshot = () => {
    return notificationService.getNotifications();
};

function NotificationCenter() {
    const notifications = useSyncExternalStore(subscribe, getSnapshot);

    return (
        <div className="notification-center">
            <div className="notification-center-header">
                <h3>Notifications</h3>
                <button onClick={() => notificationService.clearAll()} title="Clear All">
                    <Trash2 size={16}/>
                </button>
            </div>
            <div className="notification-list">
                {notifications.length === 0 ? (
                    <p>No notifications.</p>
                ) : (
                    notifications.map(n => (
                        <div key={n.id} className={`notification-item notification-item-${n.type || 'info'}`}>
                            <strong>{n.title}</strong>
                            <div className="notification-item-body">
                                {typeof n.render === 'function'
                                    ? n.render()
                                    : <p>{n.message}</p>}
                            </div>
                            <small>{new Date(n.timestamp).toLocaleTimeString()}</small>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default NotificationCenter;
