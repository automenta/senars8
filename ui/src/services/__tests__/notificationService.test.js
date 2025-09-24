import notificationService from '@/services/notificationService';

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

    it('should add an info notification with default duration', () => {
        const id = notificationService.addInfo('Info Title', 'Info message');
        
        expect(id).toBe(0);
        expect(notificationService.notifications).toHaveLength(1);
        expect(notificationService.notifications[0]).toMatchObject({
            id: 0,
            title: 'Info Title',
            message: 'Info message',
            type: 'info',
            duration: 5000
        });
    });

    it('should add a success notification with default duration', () => {
        const id = notificationService.addSuccess('Success Title', 'Success message');
        
        expect(id).toBe(0);
        expect(notificationService.notifications).toHaveLength(1);
        expect(notificationService.notifications[0]).toMatchObject({
            id: 0,
            title: 'Success Title',
            message: 'Success message',
            type: 'success',
            duration: 4000
        });
    });

    it('should add a warning notification with default duration', () => {
        const id = notificationService.addWarning('Warning Title', 'Warning message');
        
        expect(id).toBe(0);
        expect(notificationService.notifications).toHaveLength(1);
        expect(notificationService.notifications[0]).toMatchObject({
            id: 0,
            title: 'Warning Title',
            message: 'Warning message',
            type: 'warning',
            duration: 7000
        });
    });

    it('should add an error notification with default duration', () => {
        const id = notificationService.addError('Error Title', 'Error message');
        
        expect(id).toBe(0);
        expect(notificationService.notifications).toHaveLength(1);
        expect(notificationService.notifications[0]).toMatchObject({
            id: 0,
            title: 'Error Title',
            message: 'Error message',
            type: 'error',
            duration: 8000
        });
    });

    it('should remove a notification', () => {
        notificationService.addNotification({title: 'Test', message: 'Test message'});
        notificationService.addNotification({title: 'Test2', message: 'Test message2'});
        
        expect(notificationService.notifications).toHaveLength(2);
        
        notificationService.removeNotification(0);
        
        expect(notificationService.notifications).toHaveLength(1);
        expect(notificationService.notifications[0].id).toBe(1);
    });

    it('should clear all notifications', () => {
        notificationService.addNotification({title: 'Test', message: 'Test message'});
        notificationService.addNotification({title: 'Test2', message: 'Test message2'});
        
        expect(notificationService.notifications).toHaveLength(2);
        
        notificationService.clearAll();
        
        expect(notificationService.notifications).toHaveLength(0);
    });

    it('should get all notifications', () => {
        const notification = {title: 'Test', message: 'Test message'};
        notificationService.addNotification(notification);
        
        const notifications = notificationService.getNotifications();
        
        expect(notifications).toHaveLength(1);
        expect(notifications[0]).toMatchObject({
            title: 'Test',
            message: 'Test message',
            timestamp: expect.any(Date)
        });
    });
});