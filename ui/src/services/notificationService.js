import { EventBus } from '@senars/common/utils/eventBus.js';
import log from '@core/utils/logger.js';
import {NOTIFICATION_TYPES, UI_CONSTANTS} from '@/constants/ui';

class NotificationService extends EventBus {
    constructor() {
        super();
        this.notifications = [];
        this.nextId = 0;
        this.maxNotifications = UI_CONSTANTS.UI.MAX_NOTIFICATIONS; // Limit to prevent memory issues
        this.defaultDuration = UI_CONSTANTS.UI.DEFAULT_NOTIFICATION_DURATION; // Default notification duration
    }

    addNotification(notification) {
        // Validate notification object
        if (!notification || typeof notification !== 'object') {
            log.error('Invalid notification object provided');
            return -1;
        }

        // Validate required properties
        if (!notification.title && !notification.message) {
            log.error('Notification must have at least a title or message');
            return -1;
        }

        // Create a new notification with required fields
        const newNotification = {
            id: this.nextId++,
            title: notification.title || 'Notification',
            message: notification.message || '',
            type: notification.type || 'info',
            timestamp: new Date(),
            duration: notification.duration || this.defaultDuration,
            ...notification // Spread additional properties
        };

        // Add to notifications array
        this.notifications = [...this.notifications, newNotification];

        // Prune old notifications if we exceed the maximum
        if (this.notifications.length > this.maxNotifications) {
            this.notifications = this.notifications.slice(-this.maxNotifications);
        }

        // Emit change event for UI updates
        this.emit('change', this.notifications);

        // Log for debugging
        log.info(`Notification added: ${newNotification.title}`, newNotification);

        return newNotification.id;
    }

    addInfo(title, message, options = {}) {
        return this.addNotification({
            title,
            message,
            type: NOTIFICATION_TYPES.INFO,
            ...options
        });
    }

    addSuccess(title, message, options = {}) {
        return this.addNotification({
            title,
            message,
            type: NOTIFICATION_TYPES.SUCCESS,
            duration: 4000, // Custom duration for success notifications
            ...options
        });
    }

    addWarning(title, message, options = {}) {
        return this.addNotification({
            title,
            message,
            type: NOTIFICATION_TYPES.WARNING,
            duration: 7000, // Custom duration for warning notifications
            ...options
        });
    }

    addError(title, message, options = {}) {
        return this.addNotification({
            title,
            message,
            type: NOTIFICATION_TYPES.ERROR,
            duration: 8000, // Custom duration for error notifications
            ...options
        });
    }

    // Add method to add notifications with auto-removal
    addTemporaryNotification(notification) {
        const id = this.addNotification(notification);

        // Auto-remove after specified duration
        if (notification.duration && notification.duration > 0) {
            setTimeout(() => {
                this.removeNotification(id);
            }, notification.duration);
        }

        return id;
    }

    removeNotification(id) {
        const initialLength = this.notifications.length;
        this.notifications = this.notifications.filter(n => n.id !== id);

        if (this.notifications.length !== initialLength) {
            this.emit('change', this.notifications);
            log.info(`Notification removed: ${id}`);
        } else {
            log.warn(`Attempted to remove non-existent notification: ${id}`);
        }
    }

    clearAll() {
        this.notifications = [];
        this.emit('change', this.notifications);
        log.info('All notifications cleared');
    }

    clearByType(type) {
        const initialLength = this.notifications.length;
        this.notifications = this.notifications.filter(n => n.type !== type);

        if (this.notifications.length !== initialLength) {
            this.emit('change', this.notifications);
            log.info(`Cleared notifications of type: ${type}`);
        }
    }

    getNotifications() {
        return this.notifications;
    }

    // Get notifications by type
    getNotificationsByType(type) {
        return this.notifications.filter(n => n.type === type);
    }

    // Get count of notifications
    getCount() {
        return this.notifications.length;
    }

    // Get count by type
    getCountByType(type) {
        return this.notifications.filter(n => n.type === type).length;
    }
}

const notificationService = new NotificationService();
export default notificationService;
