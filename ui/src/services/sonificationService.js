// Simple logging utility for the UI
const log = {
    info: (message, ...args) => console.log(`[INFO] ${message}`, ...args),
    warn: (message, ...args) => console.warn(`[WARN] ${message}`, ...args),
    error: (message, ...args) => console.error(`[ERROR] ${message}`, ...args),
    debug: (message, ...args) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }
};

class SonificationService {
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;
    }

    // Initialize the AudioContext on the first user interaction
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

    // Play a simple beep sound with frequency and duration
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

    // Play different sounds based on event type
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
