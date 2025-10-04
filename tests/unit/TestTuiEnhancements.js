import {TuiRenderer} from '../../tui/src/TuiRenderer.js';
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
    const renderer = new TuiRenderer();
    const view = new TuiView(mockApiService, renderer);

    // Initialize the renderer
    renderer.initialize();

    // Render with mock state to test new components
    const mockState = mockApiService.getAgentState();
    renderer.render(mockState);

    // Check that new components exist
    console.log('✓ Renderer initialized successfully');
    console.log('✓ Components created:', Object.keys(renderer.components));

    // Verify all expected components exist
    const expectedComponents = ['log', 'status', 'performance', 'beliefs', 'goals', 'tasks', 'stats', 'input'];
    const missingComponents = expectedComponents.filter(comp => !renderer.components[comp]);

    if (missingComponents.length === 0) {
        console.log('✓ All expected components present:', expectedComponents.join(', '));
    } else {
        console.log('✗ Missing components:', missingComponents.join(', '));
        return false;
    }

    // Test rendering methods
    renderer.updateStatus(mockState);
    renderer.updatePerformance(mockState);
    renderer.updateStats(mockState);
    renderer.updateBeliefs(mockState.memory.beliefs);
    renderer.updateGoals(mockState.memory.goals);
    renderer.updateTasks(mockState.tasks);

    console.log('✓ All rendering methods executed successfully');

    // Test new commands exist
    const expectedCommands = ['stats', 'memory', 'reset', 'pause', 'resume'];
    const missingCommands = expectedCommands.filter(cmd => !view.commandMap[cmd]);

    if (missingCommands.length === 0) {
        console.log('✓ All new commands present:', expectedCommands.join(', '));
    } else {
        console.log('✗ Missing commands:', missingCommands.join(', '));
        return false;
    }

    console.log('✓ TUI enhancements working properly!');
    return true;
}

// Run the test
testEnhancedTui().catch(console.error);