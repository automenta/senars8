import React, {useState} from 'react';
import { Panel, SendButton, EnhancedInput } from '@ui/components';
import agentService from '@/services/agentService';
import {useConnection} from '@/context/ConnectionProvider';
import useInputHistory from '@/hooks/useInputHistory';
import {CornerDownLeft, HelpCircle, BookOpen, MessageCircle, Lightbulb, Bot, AlertCircle, Wifi, WifiOff} from 'lucide-react';
import './InputPanel.css';

// Example natural language inputs for quick access
const NATURAL_EXAMPLES = [
    'Tell me about birds',
    'What is a robin?',
    'Do birds fly?',
    'Explain the concept of animal',
    'How are birds and animals related?',
    'What can you tell me about TOM?',
    'Is the book interesting?',
];

// Example Narsese statements for quick access
const NARSESE_EXAMPLES = [
    '<robin --> bird>.',
    '<bird --> animal>.',
    '(&&, <robin --> bird>, <robin --> animal>)?',
    '<(*, TOM, book) --> own>.',
    '<(*, book, interesting) --> property>.',
    '<<$x --> bird> ==> <$x --> animal>>?',
    '<bird <-> animal>?',
];

function InputPanel() {
    const {isConnected, connectionStatus, connectionError, reconnect} = useConnection();
    const {inputValue, setInputValue, history, addToHistory} = useInputHistory();
    const [showExamples, setShowExamples] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [inputMode, setInputMode] = useState('natural'); // Can be 'natural' or 'narsese'
    const [suggestedResponses, setSuggestedResponses] = useState([]);

    // Validate Narsese input
    const validateNarsese = (input) => {
        // Basic validation - check if input ends with '.' or '?'
        const trimmed = input.trim();
        if (trimmed && !trimmed.endsWith('.') && !trimmed.endsWith('?')) {
            return 'Narsese statements should end with "." (judgment) or "?" (question)';
        }
        return '';
    };

    // Simple intent recognition for natural language
    const recognizeIntent = (input) => {
        const lowerInput = input.toLowerCase();
        
        // Simple rule-based intent recognition
        if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
            return { type: 'greeting', action: 'greet' };
        } else if (lowerInput.includes('what') || lowerInput.includes('how') || lowerInput.includes('?')) {
            return { type: 'question', action: 'answer' };
        } else if (lowerInput.includes('tell') || lowerInput.includes('explain')) {
            return { type: 'request_info', action: 'provide_info' };
        } else if (lowerInput.includes('help')) {
            return { type: 'help_request', action: 'provide_help' };
        } else {
            return { type: 'statement', action: 'process' };
        }
    };

    const handleSend = () => {
        if (!inputValue.trim()) return;

        if (!isConnected) {
            setValidationError('Cannot send: not connected to agent. Please check your connection.');
            return;
        }

        // Process based on input mode
        if (inputMode === 'natural') {
            // Recognize intent from natural language
            const intent = recognizeIntent(inputValue);
            
            // Generate suggested follow-up responses based on context
            generateSuggestedResponses(inputValue, intent);
            
            // Send as natural language request
            const success = agentService.sendNaturalLanguage(inputValue, intent);
            if (success) {
                addToHistory(inputValue);
            } else {
                setValidationError('Failed to send message. It has been queued for delivery.');
            }
        } else {
            // Narsese mode
            const error = validateNarsese(inputValue);
            if (error) {
                setValidationError(error);
                return;
            }
            
            setValidationError('');
            const success = agentService.sendNarsese(inputValue);
            if (success) {
                addToHistory(inputValue);
            } else {
                setValidationError('Failed to send message. It has been queued for delivery.');
            }
        }
        
        // Clear input after sending
        setInputValue('');
        setValidationError('');
    };

    // Generate suggested responses based on user input and intent
    const generateSuggestedResponses = (input, intent) => {
        const suggestions = [];
        const lowerInput = input.toLowerCase();

        if (intent.type === 'question') {
            if (lowerInput.includes('bird')) {
                suggestions.push("What is the relationship between birds and animals?");
            } else if (lowerInput.includes('animal')) {
                suggestions.push("Can you give examples of animals?");
            } else {
                suggestions.push("Can you elaborate on that?");
                suggestions.push("What else can you tell me about this?");
            }
        } else if (intent.type === 'greeting') {
            suggestions.push("What can you help me with?");
            suggestions.push("Tell me something interesting.");
        } else if (lowerInput.includes('bird') || lowerInput.includes('robin')) {
            suggestions.push("Do birds fly?");
            suggestions.push("What other birds are there?");
        }

        setSuggestedResponses(suggestions.slice(0, 3)); // Limit to 3 suggestions
    };

    const handleExampleClick = (example) => {
        setInputValue(example);
        setShowExamples(false);
    };

    const handleClear = () => {
        setInputValue('');
        setValidationError('');
        setSuggestedResponses([]);
    };

    const currentExamples = inputMode === 'natural' ? NATURAL_EXAMPLES : NARSESE_EXAMPLES;
    const examplesTitle = inputMode === 'natural' ? 'Natural Language Examples' : 'Narsese Examples';

    return (
        <Panel title={<><MessageCircle size={18}/> Chat</>} >
            <div className="input-panel-wrapper">
                {/* Connection status indicator */}
                <div className="connection-status">
                    <div className={`status-indicator ${connectionStatus}`}>
                        {connectionStatus === 'connected' ? (
                            <><Wifi size={14} color="limegreen" className="status-icon" /> Connected</>
                        ) : connectionStatus === 'connecting' ? (
                            <><Wifi size={14} color="orange" className="status-icon" /> Connecting...</>
                        ) : connectionStatus === 'failed' ? (
                            <><WifiOff size={14} color="red" className="status-icon" /> Connection Failed</>
                        ) : (
                            <><WifiOff size={14} color="gray" className="status-icon" /> Disconnected</>
                        )}
                    </div>
                    
                    {!isConnected && connectionStatus !== 'disconnected' && (
                        <button 
                            className="reconnect-button"
                            onClick={reconnect}
                            title="Reconnect to agent"
                        >
                            Reconnect
                        </button>
                    )}
                </div>
                
                <div className="input-panel-header">
                    <button 
                        className="examples-toggle"
                        onClick={() => setShowExamples(!showExamples)}
                        title="Show/Hide Examples"
                    >
                        <BookOpen size={16} />
                        Examples
                    </button>
                    <button 
                        className="help-toggle"
                        onClick={() => window.open('https://github.com/opennars/OpenNARS-for-Applications/wiki/Narsese-Guide', '_blank')}
                        title="Narsese Guide"
                    >
                        <HelpCircle size={16} />
                        Help
                    </button>
                </div>
                
                {showExamples && (
                    <div className="examples-container">
                        <h4>{examplesTitle}:</h4>
                        <div className="examples-grid">
                            {currentExamples.map((example, index) => (
                                <button
                                    key={index}
                                    className="example-item"
                                    onClick={() => handleExampleClick(example)}
                                >
                                    {example}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {validationError && (
                    <div className="validation-error">
                        <AlertCircle size={14} className="error-icon" />
                        {validationError}
                    </div>
                )}
                
                {connectionError && (
                    <div className="connection-error">
                        <AlertCircle size={14} className="error-icon" />
                        Connection error: {connectionError.message || connectionError.toString()}
                    </div>
                )}
                
                <EnhancedInput
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={handleSend}
                    history={history}
                    inputMode={inputMode}
                    setMode={setInputMode}
                />
                
                <div className="input-panel-actions">
                    <SendButton 
                        onClick={handleSend} 
                        disabled={!isConnected || !inputValue.trim()} 
                        title={isConnected ? "Send to agent" : "Connect to agent first"}
                    />
                    <button 
                        className="clear-button"
                        onClick={handleClear}
                        disabled={!inputValue.trim()}
                    >
                        Clear
                    </button>
                </div>
                
                {/* Show suggested responses */}
                {suggestedResponses.length > 0 && (
                    <div className="suggested-responses">
                        <h4><Lightbulb size={14} /> Suggestions:</h4>
                        <div className="suggestions-grid">
                            {suggestedResponses.map((suggestion, index) => (
                                <button
                                    key={index}
                                    className="suggestion-item"
                                    onClick={() => setInputValue(suggestion)}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {history.length > 0 && (
                    <div className="input-history">
                        <h4>Recent Inputs:</h4>
                        <div className="history-list">
                            {history.slice(0, 3).map((item, index) => (
                                <button
                                    key={index}
                                    className="history-item"
                                    onClick={() => setInputValue(item)}
                                    title={item}
                                >
                                    {item.length > 30 ? `${item.substring(0, 30)}...` : item}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Panel>
    );
}

export default InputPanel;