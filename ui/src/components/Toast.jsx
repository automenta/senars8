import React, {useEffect} from 'react';
import PropTypes from 'prop-types';
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
        <div className={`toast toast-${notification.type || 'info'}`} role="alert">
            <div className="toast-header">
                <strong>{notification.title}</strong>
                <button onClick={() => onDismiss(notification.id)} className="close-button" aria-label="Dismiss notification">
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

Toast.propTypes = {
    notification: PropTypes.shape({
        id: PropTypes.number.isRequired,
        title: PropTypes.string.isRequired,
        message: PropTypes.string,
        type: PropTypes.string,
        duration: PropTypes.number,
        render: PropTypes.func,
    }).isRequired,
    onDismiss: PropTypes.func.isRequired,
};

export default Toast;
