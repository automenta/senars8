import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {AppRunner} from '../../main.js';

// Mock AgentManager to isolate the AppRunner logic
vi.mock('../../agent/AgentManager.js', () => {
    const mockInitialize = vi.fn().mockResolvedValue(true);
    const mockStop = vi.fn().mockResolvedValue();
    const mockGetAgent = vi.fn(() => ({}));
    return {
        default: vi.fn(() => ({
            initialize: mockInitialize,
            stop: mockStop,
            getAgent: mockGetAgent,
        })),
        mockInitialize,
        mockStop,
    };
});

describe('AppRunner Logic', () => {
    let startWebInterfaceSpy, startTuiSpy, startAgentSpy;
    let mockInitialize, mockStop;

    beforeEach(async () => {
        // Dynamically import mocks within an async context
        const mocks = await import('../../agent/AgentManager.js');
        mockInitialize = mocks.mockInitialize;
        mockStop = mocks.mockStop;

        // Clear mock history before each test to ensure isolation
        vi.clearAllMocks();

        // Spy on the AppRunner methods to check if they are called correctly
        startWebInterfaceSpy = vi.spyOn(AppRunner, 'startWebInterface').mockResolvedValue(null);
        startTuiSpy = vi.spyOn(AppRunner, 'startTui').mockResolvedValue(null);
        startAgentSpy = vi.spyOn(AppRunner, 'startAgent').mockResolvedValue(null);
    });

    afterEach(async () => {
        // Restore original method implementations
        vi.restoreAllMocks();
        // Ensure all components are shut down after each test
        await AppRunner.shutdown();
    });

    it('should initialize AgentManager on any startup', async () => {
        await AppRunner.run({});
        expect(mockInitialize).toHaveBeenCalledTimes(1);
    });

    it('should call startAgent by default when no args are provided', async () => {
        await AppRunner.run({});
        expect(startAgentSpy).toHaveBeenCalledTimes(1);
        expect(startTuiSpy).not.toHaveBeenCalled();
        expect(startWebInterfaceSpy).not.toHaveBeenCalled();
    });

    it('should call startTui when the tui flag is true', async () => {
        await AppRunner.run({tui: true});
        expect(startTuiSpy).toHaveBeenCalledTimes(1);
        expect(startAgentSpy).not.toHaveBeenCalled();
        expect(startWebInterfaceSpy).not.toHaveBeenCalled();
    });

    it('should call startWebInterface when the web flag is true', async () => {
        await AppRunner.run({web: true});
        expect(startWebInterfaceSpy).toHaveBeenCalledTimes(1);
        expect(startAgentSpy).not.toHaveBeenCalled();
        expect(startTuiSpy).not.toHaveBeenCalled();
    });

    it('should call AgentManager.stop exactly once during a run/shutdown cycle', async () => {
        await AppRunner.run({});
        expect(mockStop).not.toHaveBeenCalled();

        await AppRunner.shutdown();

        expect(mockStop).toHaveBeenCalledTimes(1);
    });
});