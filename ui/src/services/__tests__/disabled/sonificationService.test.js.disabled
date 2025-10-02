// Mock AudioContext
const mockOscillator = {
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: {value: 0},
    type: 'sine'
};

const mockGainNode = {
    connect: jest.fn(),
    gain: {value: 0}
};

const mockAudioContext = {
    createOscillator: jest.fn().mockReturnValue(mockOscillator),
    createGain: jest.fn().mockReturnValue(mockGainNode),
    destination: {},
    currentTime: 0
};

// Mock the global AudioContext
global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
global.webkitAudioContext = jest.fn().mockImplementation(() => mockAudioContext);

import sonificationService from '../sonificationService';

describe('SonificationService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset service state
        sonificationService.isInitialized = false;
        sonificationService.audioContext = null;
    });

    it('should initialize AudioContext', () => {
        sonificationService.initialize();

        expect(global.AudioContext).toHaveBeenCalled();
        expect(sonificationService.isInitialized).toBe(true);
        expect(sonificationService.audioContext).toBe(mockAudioContext);
    });

    it('should play sound with default parameters', () => {
        sonificationService.isInitialized = true;
        sonificationService.audioContext = mockAudioContext;

        sonificationService.playSound();

        expect(mockAudioContext.createOscillator).toHaveBeenCalled();
        expect(mockAudioContext.createGain).toHaveBeenCalled();
        expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode);
        expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
        expect(mockOscillator.type).toBe('sine');
        expect(mockOscillator.frequency.value).toBe(440);
        expect(mockGainNode.gain.value).toBe(0.1);
        expect(mockOscillator.start).toHaveBeenCalled();
        expect(mockOscillator.stop).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should play different sounds based on event type', () => {
        sonificationService.isInitialized = true;
        sonificationService.audioContext = mockAudioContext;

        // Mock console.log to avoid output during tests
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        sonificationService.playEventSound('add_belief');
        expect(mockOscillator.frequency.value).toBe(523.25);

        sonificationService.playEventSound('reasoning_step');
        expect(mockOscillator.frequency.value).toBe(659.25);

        sonificationService.playEventSound('system_cycle');
        expect(mockOscillator.frequency.value).toBe(783.99);

        sonificationService.playEventSound('unknown');
        expect(mockOscillator.frequency.value).toBe(440);

        consoleLogSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });
});