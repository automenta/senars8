import React, {useSyncExternalStore} from 'react';
import PropTypes from 'prop-types';
import notificationService from '@/services/notificationService';
import {Trash2, X} from 'lucide-react';
import './style.css';

const subscribe = (callback) => {
    notificationService.on('change', callback);
    return () => {
        notificationService.off('change', callback);
    };
};

const getSnapshot = () => {
    return notificationService.getNotifications();
};

function NotificationCenter({filter = 'all', sortBy = 'newest'}) {
    const notifications = useSyncExternalStore(subscribe, getSnapshot);

    // Filter notifications
    const filteredNotifications = notifications.filter(n => {
        if (filter === 'all') return true;
        return (n.type || 'info') === filter;
    });

    // Sort notifications
    const sortedNotifications = [...filteredNotifications].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();

        if (sortBy === 'newest') {
            return timeB - timeA;
        } else {
            return timeA - timeB;
        }
    });

    const handleDismiss = (id) => {
        notificationService.removeNotification(id);
    };

    return (
        <div className="notification-center">
            <div className="notification-center-header">
                <h3>Notifications ({sortedNotifications.length})</h3>
                <button
                    onClick={() => notificationService.clearAll()}
                    title="Clear All"
                    aria-label="Clear all notifications"
                    disabled={sortedNotifications.length === 0}
                >
                    <Trash2 size={16}/>
                </button>
            </div>
            <div className="notification-list">
                {sortedNotifications.length === 0 ? (
                    <div className="notification-empty">
                        {filter === 'all' ? 'No notifications.' : `No ${filter} notifications.`}
                    </div>
                ) : (
                    sortedNotifications.map(n => (
                        <div key={n.id} className={`notification-item notification-item-${n.type || 'info'}`}>
                            <div className="notification-header">
                                <strong>{n.title}</strong>
                                <button
                                    onClick={() => handleDismiss(n.id)}
                                    className="dismiss-button"
                                    aria-label="Dismiss notification"
                                >
                                    <X size={14}/>
                                </button>
                            </div>
                            <div className="notification-item-body">
                                {typeof n.render === 'function'
                                    ? n.render()
                                    : <p>{n.message}</p>}
                            </div>
                            <small className="notification-timestamp">
                                {new Date(n.timestamp).toLocaleString()}
                            </small>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

NotificationCenter.propTypes = {
    filter: PropTypes.oneOf(['all', 'info', 'warning', 'error']),
    sortBy: PropTypes.oneOf(['newest', 'oldest'])
};

export default NotificationCenter;