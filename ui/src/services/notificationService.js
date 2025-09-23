import { EventEmitter } from 'events';

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
