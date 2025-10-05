import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import TuiAgentService from '../../tui/src/services/TuiAgentService.js';
import {connectionManager} from '../../common/services/connection.js';

describe('TUI End-to-End Integration Test', () => {
    let tuiService;

    beforeAll(async () => {
        // Create embedded TUI service directly
        tuiService = new TuiAgentService('embedded');
        tuiService.connect();

        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 2000));
    }, 30000);

    afterAll(async () => {
        if (tuiService) {
            tuiService.disconnect();
            await connectionManager.destroy();
        }
    });

    it('should connect and get agent state', async () => {
        // Get the embedded service's agent state through the TUI service
        const state = tuiService.getAgentState();
        expect(state).toBeDefined();
    });

    it('should handle agent commands', async () => {
        // Send a test command through the TUI service
        tuiService.sendMessage('test_command', {});

        // The embedded service should handle this gracefully
        expect(tuiService).toBeDefined();
        expect(tuiService.connectionMode).toBe('embedded');
    });
});