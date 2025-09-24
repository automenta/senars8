import React, {useState, useCallback} from 'react';
import { Panel, SendButton, EnhancedInput } from '@ui/components';
import agentService from '@/services/agentService';
import notificationService from '@/services/notificationService';
import {useConnection} from '@/context/useConnection';
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

    // Enhanced Narsese input validation and sanitization
    const validateNarsese = useCallback((input) => {
        // Basic validation - check if input ends with '.' or '?'
        const trimmed = input.trim();
        if (!trimmed) {
            return 'Input cannot be empty';
        }
        
        // Check if input ends with '.' or '?'
        if (!trimmed.endsWith('.') && !trimmed.endsWith('?')) {
            return 'Narsese statements should end with "." (judgment) or "?" (question)';
        }
        
        // Check for balanced angle brackets
        const openBrackets = (trimmed.match(/</g) || []).length;
        const closeBrackets = (trimmed.match(/>/g) || []).length;
        if (openBrackets !== closeBrackets) {
            return 'Unbalanced angle brackets in statement';
        }
        
        // Check for balanced parentheses in compound terms
        const roundOpen = (trimmed.match(/\(/g) || []).length;
        const roundClose = (trimmed.match(/\)/g) || []).length;
        if (roundOpen !== roundClose) {
            return 'Unbalanced parentheses in statement';
        }
        
        // Check for potentially dangerous content
        if (trimmed.includes('<script') || trimmed.includes('javascript:')) {
            return 'Invalid characters detected';
        }
        
        // Check for maximum length
        if (trimmed.length > 1000) {
            return 'Input is too long (max 1000 characters)';
        }
        
        return '';
    }, []);

    // Enhanced intent recognition for natural language with validation
    const recognizeIntent = useCallback((input) => {
        // Sanitize input
        const sanitizedInput = input.replace(/<[^>]*>/g, '').trim(); // Remove HTML tags
        const lowerInput = sanitizedInput.toLowerCase();
        
        // Validation rules
        if (sanitizedInput.length > 1000) {
            return { type: 'invalid', action: 'error', error: 'Input too long' };
        }
        
        if (sanitizedInput.includes('<script') || sanitizedInput.includes('javascript:')) {
            return { type: 'invalid', action: 'error', error: 'Invalid characters detected' };
        }
        
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
    }, []);

    const handleSend = useCallback(() => {
        try {
            if (!inputValue.trim()) {
                setValidationError('Cannot send: input is empty.');
                notificationService.addWarning('Input Error', 'Cannot send empty input');
                return;
            }

            if (!isConnected) {
                setValidationError('Cannot send: not connected to agent. Please check your connection.');
                notificationService.addError('Connection Error', 'Not connected to agent. Please check your connection.');
                return;
            }

            // Process based on input mode
            if (inputMode === 'natural') {
                try {
                    // Recognize intent from natural language
                    const intent = recognizeIntent(inputValue);
                    
                    // Check for validation errors in intent
                    if (intent.type === 'invalid' && intent.error) {
                        setValidationError(intent.error);
                        notificationService.addWarning('Input Error', intent.error);
                        return;
                    }
                    
                    // Generate suggested follow-up responses based on context
                    generateSuggestedResponses(inputValue, intent);
                    
                    // Sanitize input before sending
                    const sanitizedInput = inputValue.replace(/<[^>]*>/g, '').trim();
                    
                    // Send as natural language request
                    const success = agentService.sendNaturalLanguage(sanitizedInput, intent);
                    if (success) {
                        addToHistory(sanitizedInput);
                        notificationService.addSuccess('Message Sent', 'Natural language message sent successfully');
                    } else {
                        setValidationError('Failed to send message. It has been queued for delivery.');
                        notificationService.addWarning('Message Queued', 'Message queued for delivery when connection is restored');
                    }
                } catch (error) {
                    log.error('Error processing natural language input:', error);
                    setValidationError('Error processing natural language input');
                    notificationService.addError('Processing Error', 'Failed to process natural language input');
                }
            } else {
                // Narsese mode
                try {
                    const error = validateNarsese(inputValue);
                    if (error) {
                        setValidationError(error);
                        notificationService.addWarning('Narsese Validation Error', error);
                        return;
                    }
                    
                    setValidationError('');
                    const success = agentService.sendNarsese(inputValue);
                    if (success) {
                        addToHistory(inputValue);
                        notificationService.addSuccess('Narsese Sent', 'Narsese statement sent successfully');
                    } else {
                        setValidationError('Failed to send message. It has been queued for delivery.');
                        notificationService.addWarning('Message Queued', 'Message queued for delivery when connection is restored');
                    }
                } catch (error) {
                    log.error('Error processing Narsese input:', error);
                    setValidationError('Error processing Narsese input');
                    notificationService.addError('Processing Error', 'Failed to process Narsese input');
                }
            }
        } catch (error) {
            log.error('Unexpected error in handleSend:', error);
            setValidationError('An unexpected error occurred while sending the message');
            notificationService.addError('Unexpected Error', 'An error occurred while sending the message');
        } finally {
            // Always clear input after sending attempt
            setInputValue('');
            setValidationError('');
        }
    }, [inputValue, isConnected, inputMode, recognizeIntent, generateSuggestedResponses, addToHistory, validateNarsese, setValidationError, setInputValue]);

    // Generate suggested responses based on user input and intent
    const generateSuggestedResponses = useCallback((input, intent) => {
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
    }, [setSuggestedResponses]);

    const handleExampleClick = useCallback((example) => {
        setInputValue(example);
        setShowExamples(false);
    }, [setInputValue, setShowExamples]);

    const handleClear = useCallback(() => {
        setInputValue('');
        setValidationError('');
        setSuggestedResponses([]);
    }, [setInputValue, setValidationError, setSuggestedResponses]);

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