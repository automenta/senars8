// Mock WebSocket
const mockWebSocket = {
    close: jest.fn(),
    send: jest.fn(),
};

const mockWebSocketClass = jest.fn().mockImplementation(() => mockWebSocket);

global.WebSocket = mockWebSocketClass;

import agentService from '../agentService';

describe('AgentService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should connect to WebSocket', () => {
        agentService.connect();
        
        expect(mockWebSocketClass).toHaveBeenCalledWith('ws://localhost:8080');
        expect(agentService.ws).toBe(mockWebSocket);
    });

    it('should send NARSese messages', () => {
        agentService.isConnected = true;
        agentService.ws = mockWebSocket;
        
        agentService.sendNarsese('<test --> test>.');
        
        expect(mockWebSocket.send).toHaveBeenCalledWith(
            JSON.stringify({type: 'narsese', payload: '<test --> test>.'})
        );
    });

    it('should send agent control commands', () => {
        agentService.isConnected = true;
        agentService.ws = mockWebSocket;
        
        agentService.sendAgentControl('start');
        
        expect(mockWebSocket.send).toHaveBeenCalledWith(
            JSON.stringify({type: 'agentControl', payload: {command: 'start'}})
        );
    });
});