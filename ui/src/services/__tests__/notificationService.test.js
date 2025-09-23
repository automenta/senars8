import notificationService from '../notificationService';

describe('NotificationService', () => {
    beforeEach(() => {
        // Clear all notifications before each test
        notificationService.notifications = [];
        notificationService.nextId = 0;
    });

    it('should add a notification', () => {
        const notification = {title: 'Test', message: 'Test message'};
        const id = notificationService.addNotification(notification);
        
        expect(id).toBe(0);
        expect(notificationService.notifications).toHaveLength(1);
        expect(notificationService.notifications[0]).toMatchObject({
            id: 0,
            title: 'Test',
            message: 'Test message',
            timestamp: expect.any(Date)
        });
    });

    it('should remove a notification', () => {
        // Add two notifications
        notificationService.addNotification({title: 'Test 1', message: 'Message 1'});
        notificationService.addNotification({title: 'Test 2', message: 'Message 2'});
        
        // Remove the first one
        notificationService.removeNotification(0);
        
        expect(notificationService.notifications).toHaveLength(1);
        expect(notificationService.notifications[0].id).toBe(1);
    });

    it('should clear all notifications', () => {
        // Add two notifications
        notificationService.addNotification({title: 'Test 1', message: 'Message 1'});
        notificationService.addNotification({title: 'Test 2', message: 'Message 2'});
        
        // Clear all
        notificationService.clearAll();
        
        expect(notificationService.notifications).toHaveLength(0);
    });

    it('should get notifications', () => {
        // Add a notification
        notificationService.addNotification({title: 'Test', message: 'Message'});
        
        const notifications = notificationService.getNotifications();
        
        expect(notifications).toHaveLength(1);
        expect(notifications[0]).toMatchObject({
            id: 0,
            title: 'Test',
            message: 'Message'
        });
    });
});