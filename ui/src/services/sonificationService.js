import log from '@common/utils/logger';

/**
 * Service for playing audio feedback sounds in the UI
 */
class SonificationService {
    /**
     * Creates a new SonificationService instance
     */
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the AudioContext on the first user interaction
     */
    initialize() {
        if (this.isInitialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.isInitialized = true;
            log.info('Sonification service initialized.');
        } catch (err) {
            log.warn('AudioContext not initialized. Cannot play sound.', err);
        }
    }

    /**
     * Play a simple beep sound with specified frequency and duration
     * @param {number} [frequency=440] - The frequency of the sound in Hz (A4 is 440Hz)
     * @param {number} [duration=0.1] - The duration of the sound in seconds
     */
    playSound(frequency = 440, duration = 0.1) {
        if (!this.isInitialized || !this.audioContext) {
            log.warn('AudioContext not initialized. Cannot play sound.');
            return;
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gainNode.gain.value = 0.1;

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    /**
     * Play different sounds based on event type
     * @param {string} eventType - The type of event that occurred
     * @property {'add_belief'|'reasoning_step'|'system_cycle'} eventType - The event type to play sound for
     */
    playEventSound(eventType) {
        switch (eventType) {
            case 'add_belief':
                this.playSound(523.25, 0.1); // C5
                break;
            case 'reasoning_step':
                this.playSound(659.25, 0.1); // E5
                break;
            case 'system_cycle':
                this.playSound(783.99, 0.1); // G5
                break;
            default:
                this.playSound(440, 0.1); // A4
        }
    }
}

// Export a singleton instance
const sonificationService = new SonificationService();
export default sonificationService;
