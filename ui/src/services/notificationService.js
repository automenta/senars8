import {EventEmitter} from 'events';

class NotificationService extends EventEmitter {
    constructor() {
        super();
        this.notifications = [];
        this.nextId = 0;
    }

    addNotification(notification) {
        const newNotification = {
            id: this.nextId++,
            ...notification,
            timestamp: new Date(),
        };
        this.notifications = [...this.notifications, newNotification];
        this.emit('change', this.notifications);
        return newNotification.id;
    }
    
    // Add convenience methods for different notification types
    addInfo(title, message, options = {}) {
        return this.addNotification({
            title,
            message,
            type: 'info',
            duration: options.duration || 5000, // Default 5 seconds
            ...options
        });
    }
    
    addSuccess(title, message, options = {}) {
        return this.addNotification({
            title,
            message,
            type: 'success',
            duration: options.duration || 4000, // Default 4 seconds
            ...options
        });
    }
    
    addWarning(title, message, options = {}) {
        return this.addNotification({
            title,
            message,
            type: 'warning',
            duration: options.duration || 7000, // Default 7 seconds for warnings
            ...options
        });
    }
    
    addError(title, message, options = {}) {
        return this.addNotification({
            title,
            message,
            type: 'error',
            duration: options.duration || 8000, // Default 8 seconds for errors
            ...options
        });
    }

    removeNotification(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.emit('change', this.notifications);
    }

    clearAll() {
        this.notifications = [];
        this.emit('change', this.notifications);
    }

    getNotifications() {
        return this.notifications;
    }
}

const notificationService = new NotificationService();
export default notificationService;
