import {TuiView} from '../../tui/src/TuiView.js';

// Mock ApiService for testing the TUI rendering enhancements
class MockApiService {
    constructor() {
        this.listeners = new Map();
    }

    on(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(handler);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(handler => handler(data));
        }
    }

    getAgentState() {
        return {
            isRunning: true,
            cycleCount: 1250,
            uptime: '00:12:34',
            version: '1.1.0',
            stats: {
                cyclesPerSecond: 10.5,
                memoryUsedMB: 45.2,
                cpuUsage: 23.7,
                tasksPerSecond: 2.1
            },
            memory: {
                beliefs: [
                    {termKey: '(bird --> animal)', state: {truthValue: {confidence: 0.89}}},
                    {termKey: '(animal --> living)', state: {truthValue: {confidence: 0.95}}},
                    {termKey: '(living --> mortal)', state: {truthValue: {confidence: 0.78}}},
                    {termKey: 'bird', state: {truthValue: {confidence: 0.99}}},
                    {termKey: '(mortal --> ?)', state: {truthValue: {confidence: 0.45}}}
                ],
                goals: [
                    {termKey: 'food!', state: {truthValue: {confidence: 0.85}}},
                    {termKey: 'water!', state: {truthValue: {confidence: 0.72}}}
                ],
                concepts: Array(25).fill(0).map((_, i) => ({id: `concept_${i}`})) // Mock 25 concepts
            },
            tasks: [
                {termKey: '(bird --> mortal)', punctuation: '.', state: {truthValue: {confidence: 0.65}}},
                {termKey: '(animal --> mortal)', punctuation: '.', state: {truthValue: {confidence: 0.72}}},
                {termKey: '(bird --> animal)', punctuation: '.', state: {truthValue: {confidence: 0.89}}},
                {termKey: 'find_food', punctuation: '!', state: {truthValue: {confidence: 0.91}}},
                {termKey: '(mortal --> living)?', punctuation: '?', state: {truthValue: {confidence: 0.33}}}
            ]
        };
    }

    sendNarsese(narsese) {
        // Mock sending
        console.log(`Mock sending narsese: ${narsese}`);
        return Promise.resolve();
    }

    sendAgentControl(action) {
        // Mock sending agent control
        console.log(`Mock sending agent control: ${action}`);
        return Promise.resolve();
    }

    search(query) {
        // Mock search
        console.log(`Mock search: ${query}`);
        return Promise.resolve({results: [], query});
    }

    sendMessage(type, payload = {}) {
        // Mock sending message
        console.log(`Mock sending message: ${type}`, payload);
        return Promise.resolve();
    }
}

// Test the enhanced TUI
async function testEnhancedTui() {
    console.log('Testing enhanced TUI functionality...');

    const mockApiService = new MockApiService();
    const view = new TuiView(mockApiService);

    // Test new commands exist
    const expectedCommands = ['stats', 'memory', 'reset', 'pause', 'resume', 'beliefs', 'goals', 'tasks'];
    const missingCommands = expectedCommands.filter(cmd => !view.commandMap[cmd]);

    if (missingCommands.length === 0) {
        console.log('✓ All new commands present:', expectedCommands.join(', '));
    } else {
        console.log('✗ Missing commands:', missingCommands.join(', '));
        return false;
    }

    // Test command execution
    try {
        // Test stats command
        const stats = view.executeCommand('stats');
        if (!stats || !stats.connectionStatus) {
            console.log('✗ Stats command failed');
            return false;
        }
        console.log('✓ Stats command executed successfully');

        // Test memory command
        const memory = view.executeCommand('memory');
        if (typeof memory.beliefsCount !== 'number') {
            console.log('✗ Memory command failed');
            return false;
        }
        console.log('✓ Memory command executed successfully');

        // Test beliefs command
        const beliefs = view.executeCommand('beliefs');
        if (!Array.isArray(beliefs)) {
            console.log('✗ Beliefs command failed');
            return false;
        }
        console.log('✓ Beliefs command executed successfully');

        // Test goals command
        const goals = view.executeCommand('goals');
        if (!Array.isArray(goals)) {
            console.log('✗ Goals command failed');
            return false;
        }
        console.log('✓ Goals command executed successfully');

        // Test tasks command
        const tasks = view.executeCommand('tasks');
        if (!Array.isArray(tasks)) {
            console.log('✗ Tasks command failed');
            return false;
        }
        console.log('✓ Tasks command executed successfully');

        console.log('✓ All TUI commands working properly!');
        return true;
    } catch (error) {
        console.log('✗ Error testing TUI commands:', error.message);
        return false;
    }
}

// Run the test
testEnhancedTui().catch(console.error);