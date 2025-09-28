import { TuiController } from '../TuiController.js';
import ApiService from '@common/services/ApiService.js';

// Mock the ApiService and TuiView
vi.mock('@common/services/ApiService.js', () => {
    const EventEmitter = require('events');
    class MockApiService extends EventEmitter {
        constructor() {
            super();
            this.connect = vi.fn();
            this.on = vi.fn();
            this.removeAllListeners = vi.fn();
        }
    }
    return { default: MockApiService };
});

const mockView = {
    render: vi.fn(),
};

describe('TuiController', () => {
    let apiService;
    let tuiController;

    beforeEach(() => {
        vi.clearAllMocks(); // Clear mocks before each test
        // Create new instances for each test to ensure isolation
        apiService = new ApiService();
        tuiController = new TuiController(apiService, mockView, {});
    });

    test('should be defined', () => {
        expect(TuiController).toBeDefined();
    });

    test('should instantiate without crashing', () => {
        expect(tuiController).toBeInstanceOf(TuiController);
    });

    test('start() should set isRunning to true', () => {
        tuiController.isRunning = false; // ensure it's false before starting
        tuiController.start();
        expect(tuiController.isRunning).toBe(true);
    });

    test('stop() should set isRunning to false and unregister listeners', () => {
        tuiController.start(); // Start it first
        expect(tuiController.isRunning).toBe(true);

        tuiController.stop();
        expect(tuiController.isRunning).toBe(false);
        expect(apiService.removeAllListeners).toHaveBeenCalled();
    });

    test('constructor should register event listeners', () => {
        // The constructor is called in beforeEach, so we just check the mock
        expect(apiService.on).toHaveBeenCalled();

        // Check that 'on' was called for the events we expect
        const expectedEvents = [
            'state_update',
            'status',
            'task_update',
            'system_stats',
            'narsese',
            'message',
        ];
        const registeredEvents = apiService.on.mock.calls.map(call => call[0]);

        for (const event of expectedEvents) {
            expect(registeredEvents).toContain(event);
        }
    });
});