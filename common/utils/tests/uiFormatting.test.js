import { describe, it, expect } from 'vitest';
import { 
    formatDate, 
    formatDuration, 
    formatUptime, 
    formatBytes, 
    formatRelativeTime,
    formatCoreDataForUI,
    formatSystemStats,
    formatTasks,
    formatNotifications
} from '../uiFormatting.js';

describe('uiFormatting utilities', () => {
    it('should format dates correctly', () => {
        const date = new Date('2023-01-01T10:00:00Z');
        expect(formatDate(date)).toContain('2023');
        expect(formatDate(null)).toBe('N/A');
    });

    it('should format durations correctly', () => {
        expect(formatDuration(30)).toBe('30s');
        expect(formatDuration(90)).toBe('1m 30s');
        expect(formatDuration(3661)).toBe('1h 1m');
    });

    it('should format uptime correctly', () => {
        expect(formatUptime(30)).toBe('30s');
        expect(formatUptime(90)).toBe('1m 30s');
        expect(formatUptime(3661)).toBe('1h 1m 1s');
    });

    it('should format bytes correctly', () => {
        expect(formatBytes(0)).toBe('0 Bytes');
        expect(formatBytes(1024)).toContain('KB');
        expect(formatBytes(1024 * 1024)).toContain('MB');
    });

    it('should format relative time correctly', () => {
        const now = Date.now();
        expect(formatRelativeTime(now)).toBe('just now');
        expect(formatRelativeTime(new Date(now - 120000))).toBe('2 minutes ago'); // 2 minutes ago
    });

    it('should format core data for UI', () => {
        const task = {
            term: 'test',
            punctuation: '.',
            priority: 0.9
        };
        const formatted = formatCoreDataForUI(task);
        expect(formatted.term).toBe('test');
        expect(formatted.punctuation).toBe('.');
        expect(formatted.priority).toBe(0.9);
    });

    it('should format system stats', () => {
        const stats = {
            cycleCount: 100,
            isRunning: true,
            memoryUsage: 1024,
            beliefs: 10,
            goals: 5,
            questions: 3,
            tasks: 8,
            cpuUsage: 50,
            temperature: 30
        };
        const formatted = formatSystemStats(stats);
        expect(formatted).toContain('Cycles: 100');
        expect(formatted).toContain('Running: Yes');
    });

    it('should format tasks', () => {
        const tasks = [
            { termKey: 'test', priority: 0.8, punctuation: '.', state: { truthValue: { frequency: 0.9, confidence: 0.7 } } }
        ];
        const formatted = formatTasks(tasks, 'Test Tasks');
        expect(formatted).toContain('Test Tasks (1)');
        expect(formatted).toContain('test.');
    });

    it('should format notifications', () => {
        const notifications = [
            { timestamp: Date.now(), type: 'success', message: 'Test notification' }
        ];
        const formatted = formatNotifications(notifications, 'Test Notifications');
        expect(formatted).toContain('Test Notifications (1)');
        expect(formatted).toContain('✓');
    });
});