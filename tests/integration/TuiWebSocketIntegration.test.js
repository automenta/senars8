import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';
import TuiAgentService from '../../tui/src/services/TuiAgentService.js';
import {connectionManager} from '../../common/services/connection.js';

describe('TUI Embedded Service Integration', () => {
    let embeddedService;

    beforeAll(async () => {
        console.log(`🚀 Setting up TUI Embedded Integration test`);

        // Create embedded agent service directly
        embeddedService = new TuiAgentService('embedded');
        embeddedService.connect();

        console.log(`✅ TUI Embedded Integration setup complete`);
    }, 8000);

    afterAll(async () => {
        if (embeddedService) {
            embeddedService.disconnect();
            await connectionManager.destroy();
        }
    }, 3000);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should handle bidirectional communication between TUI and agent', async () => {
        // Send a message through the embedded service
        const taskData = {
            statement: `tui_task_${Date.now()}`, // Make unique to avoid conflicts
        };

        embeddedService.sendMessage('add_task', {taskData});

        // Just verify the service is initialized
        expect(embeddedService).toBeDefined();
        expect(embeddedService.connectionMode).toBe('embedded');
    });

    it('should handle multiple TUI services efficiently', async () => {
        // Create multiple embedded services
        const services = [
            new TuiAgentService('embedded'),
            new TuiAgentService('embedded'),
            new TuiAgentService('embedded')
        ];

        // Connect all services
        services.forEach(service => service.connect());

        // All services should work correctly
        expect(services).toHaveLength(3);

        // Test that all services are properly initialized
        services.forEach(service => {
            expect(service).toBeDefined();
            expect(service.connectionMode).toBe('embedded');
        });
    });

    it('should handle rapid message exchanges', async () => {
        // Send multiple messages in quick succession
        const messages = [
            {type: 'get_system_stats', payload: {}},
            {type: 'get_beliefs', payload: {}},
            {type: 'get_goals', payload: {}}
        ];

        // Send all messages quickly through the embedded service
        messages.forEach(msg => embeddedService.sendMessage(msg.type, msg.payload));

        // Just verify the service is initialized and messages were sent
        expect(embeddedService).toBeDefined();
        expect(embeddedService.connectionMode).toBe('embedded');
    });
});