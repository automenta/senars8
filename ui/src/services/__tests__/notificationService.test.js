import notificationService from '../notificationService';

describe('NotificationService', () => {
    beforeEach(() => {
        // Clear all notifications before each test
        notificationService.notifications = [];
        notificationService.nextId = 0;
    });

    it('should add a notification and return its ID', () => {
        const notification = { title: 'Test', message: 'Test message', type: 'info' };
        const id = notificationService.addNotification(notification);

        expect(id).toBe(0);
        expect(notificationService.notifications).toHaveLength(1);
        expect(notificationService.notifications[0]).toMatchObject({
            id: 0,
            title: 'Test',
            message: 'Test message',
            type: 'info'
        });
        expect(notificationService.notifications[0].timestamp).toBeInstanceOf(Date);
    });

    it('should add info notification with correct defaults', () => {
        const id = notificationService.addInfo('Info Title', 'Info message');

        expect(id).toBe(0);
        expect(notificationService.notifications[0]).toMatchObject({
            id: 0,
            title: 'Info Title',
            message: 'Info message',
            type: 'info',
            duration: 5000
        });
    });

    it('should add success notification with correct defaults', () => {
        const id = notificationService.addSuccess('Success Title', 'Success message');

        expect(id).toBe(0);
        expect(notificationService.notifications[0]).toMatchObject({
            id: 0,
            title: 'Success Title',
            message: 'Success message',
            type: 'success',
            duration: 4000  // Default success notification duration
        });
    });

    it('should add warning notification with correct defaults', () => {
        const id = notificationService.addWarning('Warning Title', 'Warning message');

        expect(id).toBe(0);
        expect(notificationService.notifications[0]).toMatchObject({
            id: 0,
            title: 'Warning Title',
            message: 'Warning message',
            type: 'warning',
            duration: 7000
        });
    });

    it('should add error notification with correct defaults', () => {
        const id = notificationService.addError('Error Title', 'Error message');

        expect(id).toBe(0);
        expect(notificationService.notifications[0]).toMatchObject({
            id: 0,
            title: 'Error Title',
            message: 'Error message',
            type: 'error',
            duration: 8000
        });
    });

    it('should remove notification by ID', () => {
        notificationService.addInfo('Test 1', 'Message 1');
        const id2 = notificationService.addInfo('Test 2', 'Message 2');
        notificationService.addInfo('Test 3', 'Message 3');

        expect(notificationService.notifications).toHaveLength(3);

        notificationService.removeNotification(id2);

        expect(notificationService.notifications).toHaveLength(2);
        expect(notificationService.notifications.find(n => n.id === id2)).toBeUndefined();
    });

    it('should clear all notifications', () => {
        notificationService.addInfo('Test 1', 'Message 1');
        notificationService.addInfo('Test 2', 'Message 2');

        expect(notificationService.notifications).toHaveLength(2);

        notificationService.clearAll();

        expect(notificationService.notifications).toHaveLength(0);
    });

    it('should clear notifications by type', () => {
        notificationService.addInfo('Info', 'Info message');
        notificationService.addSuccess('Success', 'Success message');
        notificationService.addInfo('Another Info', 'Another info message');

        expect(notificationService.notifications).toHaveLength(3);

        notificationService.clearByType('info');

        expect(notificationService.notifications).toHaveLength(1);
        expect(notificationService.notifications[0].type).toBe('success');
    });

    it('should get notifications by type', () => {
        notificationService.addInfo('Info 1', 'Info message 1');
        notificationService.addSuccess('Success', 'Success message');
        notificationService.addInfo('Info 2', 'Info message 2');

        const infoNotifications = notificationService.getNotificationsByType('info');

        expect(infoNotifications).toHaveLength(2);
        expect(infoNotifications.every(n => n.type === 'info')).toBe(true);
    });

    it('should return correct counts', () => {
        notificationService.addInfo('Info', 'Info message');
        notificationService.addSuccess('Success', 'Success message');
        notificationService.addInfo('Another Info', 'Another info message');

        expect(notificationService.getCount()).toBe(3);
        expect(notificationService.getCountByType('info')).toBe(2);
        expect(notificationService.getCountByType('success')).toBe(1);
        expect(notificationService.getCountByType('error')).toBe(0);
    });

    it('should handle invalid notification objects gracefully', () => {
        const invalidId = notificationService.addNotification(null);
        expect(invalidId).toBe(-1);

        const invalidId2 = notificationService.addNotification('invalid');
        expect(invalidId2).toBe(-1);

        expect(notificationService.notifications).toHaveLength(0);
    });

    it('should add temporary notification with auto-removal', () => {
        jest.useFakeTimers();

        const notification = {
            title: 'Temporary',
            message: 'Will be removed',
            duration: 1000
        };
        notificationService.addTemporaryNotification(notification);

        expect(notificationService.notifications).toHaveLength(1);

        // Advance time by the duration
        jest.advanceTimersByTime(1000);

        expect(notificationService.notifications).toHaveLength(0);

        jest.useRealTimers();
    });

    it('should handle addNotification with additional properties', () => {
        const notification = {
            title: 'Custom',
            message: 'Custom message',
            type: 'warning',
            customProp: 'customValue',
            duration: 3000
        };
        const id = notificationService.addNotification(notification);

        expect(id).toBe(0);
        expect(notificationService.notifications[0]).toMatchObject({
            id: 0,
            title: 'Custom',
            message: 'Custom message',
            type: 'warning',
            customProp: 'customValue',
            duration: 3000
        });
    });
});