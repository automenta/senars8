import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { Panel } from '@ui/components';
import agentService from '@/services/agentService';
import {MessageCircle, Trash2, RotateCcw} from 'lucide-react';
import './ConversationHistoryPanel.css';

function ConversationHistoryPanel() {
    const [conversationHistory, setConversationHistory] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);

    // Subscribe to agent service messages to capture conversation history
    useEffect(() => {
        const handleNarseseMessage = (narsese) => {
            // Add user input to conversation history
            setConversationHistory(prev => [
                ...prev,
                {
                    id: Date.now(),
                    type: 'user',
                    content: narsese,
                    timestamp: new Date().toISOString()
                }
            ]);
        };

        const handleNaturalLanguageMessage = (message) => {
            // Add user natural language input to conversation history
            setConversationHistory(prev => [
                ...prev,
                {
                    id: Date.now(),
                    type: 'user',
                    content: message.text,
                    intent: message.intent,
                    timestamp: new Date().toISOString()
                }
            ]);
        };

        const handleAgentResponse = (response) => {
            // Add agent response to conversation history
            setConversationHistory(prev => [
                ...prev,
                {
                    id: Date.now() + 1, // Ensure unique ID
                    type: 'agent',
                    content: typeof response === 'string' ? response : JSON.stringify(response),
                    timestamp: new Date().toISOString()
                }
            ]);
        };

        // Listen to messages from agent service
        // These would be the events the agent service emits for various message types
        agentService.on('narsese', handleNarseseMessage);
        agentService.on('natural_language', handleNaturalLanguageMessage);
        agentService.on('inference', (inference) => {
            // Handle inference results as agent responses
            handleAgentResponse(inference);
        });
        agentService.on('answer', (answer) => {
            // Handle answers as agent responses
            handleAgentResponse(answer);
        });
        agentService.on('belief', (belief) => {
            // Handle beliefs as agent responses
            handleAgentResponse(belief);
        });
        agentService.on('goal', (goal) => {
            // Handle goals as agent responses
            handleAgentResponse(goal);
        });
        agentService.on('question', (question) => {
            // Handle questions as agent responses 
            handleAgentResponse(question);
        });
        agentService.on('message', (message) => {
            // Handle all other messages from the agent
            // Filter for messages that are responses rather than user inputs
            if (message.type && !['narsese', 'natural_language', 'agentControl'].includes(message.type)) {
                handleAgentResponse(message.payload || message);
            }
        });

        // Cleanup listeners on component unmount
        return () => {
            agentService.off('narsese', handleNarseseMessage);
            agentService.off('natural_language', handleNaturalLanguageMessage);
            agentService.off('response', handleAgentResponse);
            agentService.off('inference', handleAgentResponse);
            agentService.off('answer', handleAgentResponse);
        };
    }, []);

    // Clear conversation history
    const clearHistory = () => {
        if (window.confirm('Are you sure you want to clear the conversation history?')) {
            setConversationHistory([]);
        }
    };

    // Format timestamp for display
    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Handle reusing a previous interaction
    const handleReuseInteraction = (content) => {
        // This would trigger some action to reuse the content
        // For example, it could set the input value in the InputPanel
        // This would require communication between panels, possibly through context or agentService
        console.log('Reusing interaction:', content);
    };

    return (
        <Panel title={<><MessageCircle size={18} /> Conversation History</>}>
            <div className="conversation-history-panel">
                <div className="conversation-controls">
                    <button 
                        className="clear-history-button"
                        onClick={clearHistory}
                        title="Clear History"
                    >
                        <Trash2 size={16} /> Clear
                    </button>
                </div>
                
                <div className="conversation-messages">
                    {conversationHistory.length === 0 ? (
                        <div className="empty-history">
                            No conversation history yet. Start chatting to see your conversation here.
                        </div>
                    ) : (
                        conversationHistory.map((message) => (
                            <div 
                                key={message.id} 
                                className={`message-item ${message.type}`}
                                onClick={() => message.type === 'user' && handleReuseInteraction(message.content)}
                            >
                                <div className="message-header">
                                    <span className="message-sender">
                                        {message.type === 'user' ? 'You' : 'Agent'}
                                    </span>
                                    <span className="message-time">
                                        {formatTime(message.timestamp)}
                                    </span>
                                </div>
                                <div className="message-content">
                                    {message.content}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Panel>
    );
}

export default ConversationHistoryPanel;