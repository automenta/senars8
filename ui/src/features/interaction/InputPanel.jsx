import React, {useCallback, useState} from 'react';
import {EnhancedInput, Panel, SendButton} from '@ui/components';
import agentService from '@/services/agentService';
import notificationService from '@/services/notificationService';
import sonificationService from '@/services/sonificationService';
import {useUIErrorHandler} from '@/services/uiErrorHandler';
import {useConnection} from '@/context/useConnection';
import {validateNarseseStatement} from '@/utils/coreIntegration';
import {AlertCircle, HelpCircle, Lightbulb, MessageCircle, Wifi, WifiOff} from 'lucide-react';
import './InputPanel.css';

function InputPanel() {
    const {handleError, safeExecute} = useUIErrorHandler('InputPanel');
    const {isConnected, connectionStatus, connectionError, reconnect} = useConnection();
    const {isSonificationEnabled} = useSettings();
    const {inputValue, setInputValue, history, addToHistory} = useInputHistory();
    const [showExamples, setShowExamples] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [inputMode, setInputMode] = useState('natural'); // Can be 'natural' or 'narsese'
    const [suggestedResponses, setSuggestedResponses] = useState([]);

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

    // Enhanced Narsese input validation and sanitization using core integration
    const validateNarsese = useCallback((input) => {
        // Use the core integration utility for validation
        const validation = validateNarseseStatement(input);

        if (validation.valid) {
            return ''; // Valid
        }

        return validation.error;
    }, []);

    // Enhanced intent recognition for natural language with validation
    const recognizeIntent = useCallback((input) => {
        // Sanitize input
        const sanitizedInput = input.replace(/<[^>]*>/g, '').trim(); // Remove HTML tags
        const lowerInput = sanitizedInput.toLowerCase();

        // Validation rules
        if (sanitizedInput.length > UI_CONSTANTS.VALIDATION.MAX_INPUT_LENGTH) {
            return {
                type: 'invalid',
                action: 'error',
                error: `Input too long (max ${UI_CONSTANTS.VALIDATION.MAX_INPUT_LENGTH} characters)`
            };
        }

        // Check for potentially dangerous content
        if (sanitizedInput.includes('<script') || sanitizedInput.includes('javascript:')) {
            return {type: 'invalid', action: 'error', error: 'Invalid characters detected'};
        }

        // Check for SQL injection patterns
        const sqlInjectionPatterns = [
            /(?:')|(?:--)|(\b(SELECT|INSERT|DELETE|UPDATE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i
        ];

        for (const pattern of sqlInjectionPatterns) {
            if (pattern.test(sanitizedInput)) {
                return {type: 'invalid', action: 'error', error: 'Potential injection attack detected'};
            }
        }

        // Check for command injection patterns
        const cmdInjectionPatterns = [
            /(?:\|\||&&|;|`|\$\(.*\)|\${.*})/
        ];

        for (const pattern of cmdInjectionPatterns) {
            if (pattern.test(sanitizedInput)) {
                return {type: 'invalid', action: 'error', error: 'Potential command injection detected'};
            }
        }

        // Simple rule-based intent recognition
        if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
            return {type: 'greeting', action: 'greet'};
        } else if (lowerInput.includes('what') || lowerInput.includes('how') || lowerInput.includes('?')) {
            return {type: 'question', action: 'answer'};
        } else if (lowerInput.includes('tell') || lowerInput.includes('explain')) {
            return {type: 'request_info', action: 'provide_info'};
        } else if (lowerInput.includes('help')) {
            return {type: 'help_request', action: 'provide_help'};
        } else if (lowerInput.includes('thank')) {
            return {type: 'gratitude', action: 'acknowledge'};
        } else {
            return {type: 'statement', action: 'process'};
        }
    }, []);

    const [isSending, setIsSending] = useState(false);

    const handleSend = useCallback(async (input) => {
        if (!input.trim()) return;

        const trimmedInput = input.trim();

        try {
            // Determine if input is Narsese based on syntax
            const isNarsese = trimmedInput.includes('<') && trimmedInput.includes('>') ||
                trimmedInput.endsWith('.') ||
                trimmedInput.endsWith('!') ||
                trimmedInput.endsWith('?');

            // Validate Narsese input if it appears to be Narsese
            if (isNarsese) {
                const validation = validateNarseseStatement(trimmedInput);
                if (!validation.valid) {
                    notificationService.addWarning('Invalid Narsese', validation.error);
                    setValidationError(validation.error);
                    return;
                }
                setValidationError(''); // Clear any previous validation errors
            }

            // Add to input history
            addToHistory(trimmedInput);

            // Show visual feedback
            setIsSending(true);

            // Play sonification if enabled
            if (isSonificationEnabled) {
                try {
                    sonificationService.play('send');
                } catch (error) {
                    console.warn('Could not play sonification:', error);
                }
            }

            // Send message based on type
            if (isNarsese) {
                agentService.sendNarsese(trimmedInput);
                notificationService.addSuccess('Narsese Sent', `Statement: ${trimmedInput}`, 3000);
            } else {
                agentService.sendNaturalLanguage(trimmedInput);
                notificationService.addInfo('NL Sent', `Input: ${trimmedInput}`, 3000);
            }

            // Clear input
            setInputValue('');
        } catch (error) {
            handleError(error, {
                operation: 'sendMessage',
                input: trimmedInput
            });
            notificationService.addError('Send Error', 'Failed to send message to agent');
        } finally {
            // Clear sending state after a delay
            setTimeout(() => setIsSending(false), 1000);
        }
    }, [addToHistory, isSonificationEnabled, handleError, validateNarseseStatement]);

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
        <Panel title={<><MessageCircle size={18}/> Chat</>}>
            <div className="input-panel-wrapper">
                {/* Connection status indicator */}
                <div className="connection-status">
                    <div className={`status-indicator ${connectionStatus}`}>
                        {connectionStatus === 'connected' ? (
                            <><Wifi size={14} color="limegreen" className="status-icon"/> Connected</>
                        ) : connectionStatus === 'connecting' ? (
                            <><Wifi size={14} color="orange" className="status-icon"/> Connecting...</>
                        ) : connectionStatus === 'failed' ? (
                            <><WifiOff size={14} color="red" className="status-icon"/> Connection Failed</>
                        ) : (
                            <><WifiOff size={14} color="gray" className="status-icon"/> Disconnected</>
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
                        className={`examples-toggle ${showExamples ? 'active' : ''}`}
                        onClick={() => setShowExamples(!showExamples)}
                        title={inputMode === 'natural' ? "Show natural language examples" : "Show Narsese examples"}
                        aria-expanded={showExamples}
                        aria-controls="examples-container"
                    >
                        <Lightbulb size={16}/>
                        {inputMode === 'natural' ? 'Natural Examples' : 'Narsese Examples'}
                    </button>
                    <button
                        className="help-toggle"
                        onClick={() => setShowHelp(!showHelp)}
                        title="Narsese Guide"
                    >
                        <HelpCircle size={16}/>
                        Help
                    </button>
                </div>

                {showHelp && (
                    <div className="help-content" role="dialog" aria-label="Narsese Guide">
                        <h4>Narsese Syntax Guide</h4>
                        <p>Narsese is the formal language for the NARS system. Here are some basic examples:</p>
                        <ul>
                            <li><code>&lt;bird --&gt; animal&gt;.</code> - A bird is an animal (inheritance relation)
                            </li>
                            <li><code>&lt;robin --&gt; bird&gt;?</code> - Is a robin a bird? (question)</li>
                            <li><code>(&&, &lt;robin --&gt; bird&gt;, &lt;bird --&gt; animal&gt;)</code> - Logical
                                conjunction
                            </li>
                        </ul>
                    </div>
                )}

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
                        <AlertCircle size={14} className="error-icon"/>
                        {validationError}
                    </div>
                )}

                {connectionError && (
                    <div className="connection-error">
                        <AlertCircle size={14} className="error-icon"/>
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
                    disabled={!isConnected || isSending}
                />

                <div className="input-panel-actions">
                    <SendButton
                        onClick={handleSend}
                        disabled={!isConnected || !inputValue.trim() || isSending}
                        title={isConnected && !isSending ? "Send to agent" : isSending ? "Sending..." : "Connect to agent first"}
                    />
                    {isSending && (
                        <span className="sending-indicator">Sending...</span>
                    )}
                    <button
                        className="clear-button"
                        onClick={handleClear}
                        disabled={!inputValue.trim() || isSending}
                    >
                        Clear
                    </button>
                </div>

                {/* Show suggested responses */}
                {suggestedResponses.length > 0 && (
                    <div className="suggested-responses">
                        <h4><Lightbulb size={14}/> Suggestions:</h4>
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