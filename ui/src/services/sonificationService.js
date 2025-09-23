class SonificationService {
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;
    }

    // Initialize the AudioContext on the first user interaction
    initialize() {
        if (this.isInitialized || typeof window === 'undefined') return;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.isInitialized = true;
        console.log('Sonification service initialized.');
    }

    // Play a simple sound based on an event type
    playEventSound(eventType) {
        // Ensure AudioContext is initialized (e.g., by a user click)
        if (!this.isInitialized) {
            this.initialize();
            if (!this.isInitialized) {
                console.warn('AudioContext not initialized. Cannot play sound.');
                return;
            }
        }

        // Create a simple oscillator
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        // Connect oscillator to gain, and gain to output
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Set frequency based on event type (simple hash)
        let frequency = 200;
        /* eslint-disable no-unused-vars */
        try {
            frequency += (eventType.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 50) * 10;
        } catch (_e) { /* ignore errors for non-string types */
        }
        /* eslint-enable no-unused-vars */

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        // Fade out the sound quickly
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);

        // Start and stop the oscillator
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }
}

// Export a singleton instance
const sonificationService = new SonificationService();
export default sonificationService;
