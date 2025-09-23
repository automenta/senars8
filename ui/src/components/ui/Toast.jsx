import React, {useEffect} from 'react';
import {X} from 'lucide-react';
import './Toast.css';

function Toast({notification, onDismiss}) {
    useEffect(() => {
        if (notification.duration) {
            const timer = setTimeout(() => {
                onDismiss(notification.id);
            }, notification.duration);
            return () => clearTimeout(timer);
        }
    }, [notification, onDismiss]);

    return (
        <div className={`toast toast-${notification.type || 'info'}`}>
            <div className="toast-header">
                <strong>{notification.title}</strong>
                <button onClick={() => onDismiss(notification.id)} className="close-button">
                    <X size={16}/>
                </button>
            </div>
            <div className="toast-body">
                {typeof notification.render === 'function'
                    ? notification.render()
                    : notification.message}
            </div>
        </div>
    );
}

export default Toast;
