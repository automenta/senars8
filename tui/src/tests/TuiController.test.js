import {TuiController} from '../TuiController.js';
import ApiService from '@senars/common/services/ApiService.js';

vi.mock('@senars/common/services/ApiService.js', () => {
    const EventEmitter = require('events');

    class MockApiService extends EventEmitter {
        constructor() {
            super();
            this.connect = vi.fn();
            this.on = vi.fn();
            this.off = vi.fn();
            this.removeAllListeners = vi.fn();
        }
    }

    return {default: MockApiService};
});

const mockView = {
    render: vi.fn(),
};

const VIEW_UPDATE_EVENTS = [
    'state_update',
    'status',
    'task_update',
    'system_stats',
    'narsese',
    'message',
];

describe('TuiController', () => {
    let apiService;
    let tuiController;

    beforeEach(() => {
        vi.clearAllMocks();
        apiService = new ApiService();
        tuiController = new TuiController(apiService, mockView);
    });

    it('should be defined', () => {
        expect(TuiController).toBeDefined();
    });

    it('should instantiate without crashing', () => {
        expect(tuiController).toBeInstanceOf(TuiController);
    });

    describe('start()', () => {
        it('should set isRunning to true and register event listeners', () => {
            tuiController.isRunning = false;
            tuiController.start();

            expect(tuiController.isRunning).toBe(true);

            expect(apiService.on).toHaveBeenCalledTimes(VIEW_UPDATE_EVENTS.length);
            const registeredEvents = apiService.on.mock.calls.map(call => call[0]);
            for (const event of VIEW_UPDATE_EVENTS) {
                expect(registeredEvents).toContain(event);
            }
        });

        it('should not do anything if already running', () => {
            tuiController.start();
            apiService.on.mockClear();
            tuiController.start();
            expect(apiService.on).not.toHaveBeenCalled();
        });
    });

    describe('stop()', () => {
        it('should set isRunning to false and unregister listeners', () => {
            tuiController.start();
            expect(tuiController.isRunning).toBe(true);

            tuiController.stop();

            expect(tuiController.isRunning).toBe(false);
            expect(apiService.off).toHaveBeenCalledTimes(VIEW_UPDATE_EVENTS.length);
            const unregisteredEvents = apiService.off.mock.calls.map(call => call[0]);
            for (const event of VIEW_UPDATE_EVENTS) {
                expect(unregisteredEvents).toContain(event);
            }
        });

        it('should not do anything if not running', () => {
            tuiController.isRunning = false;
            tuiController.stop();
            expect(apiService.off).not.toHaveBeenCalled();
        });
    });

    describe('onViewUpdate()', () => {
        it('should call the throttled render function', () => {
            vi.useFakeTimers();
            tuiController.throttledRender = vi.fn();
            tuiController.onViewUpdate();
            expect(tuiController.throttledRender).toHaveBeenCalled();
            vi.useRealTimers();
        });
    });
});