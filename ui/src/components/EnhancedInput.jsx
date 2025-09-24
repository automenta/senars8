import React, { useState, useRef, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import {Mic, MicOff, MessageSquare, Code} from 'lucide-react';
import NarseseInput from './NarseseInput';
import './NarseseInput.css'; // Reuse existing input styles

function EnhancedInput({ value, onChange, onSend, history, inputMode = 'narsese', setMode, disabled = false }) {
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);

    // Check if browser supports speech recognition
    const hasSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

    // Initialize voice recognition if supported
    React.useEffect(() => {
        if (hasSpeechRecognition) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                onChange(transcript);
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [hasSpeechRecognition, onChange]);

    // Keyboard shortcut handler for the entire component
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (disabled) return;

            // Toggle input mode with Ctrl/Cmd + Shift + M
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
                e.preventDefault();
                setMode(inputMode === 'narsese' ? 'natural' : 'narsese');
            }

            // Focus input with Ctrl/Cmd + Shift + I
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
                e.preventDefault();
                document.querySelector('.narsese-input')?.focus();
            }

            // Clear input with Escape
            if (e.key === 'Escape') {
                e.preventDefault();
                onChange('');
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [disabled, inputMode, setMode, onChange]);

    const toggleListening = useCallback(() => {
        if (!hasSpeechRecognition) {
            alert('Speech recognition is not supported in your browser.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    }, [hasSpeechRecognition, isListening]);

    const handleKeyDown = useCallback((e) => {
        try {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const newIndex = Math.min(historyIndex + 1, (history || []).length - 1);
                if (newIndex >= 0) {
                    setHistoryIndex(newIndex);
                    onChange((history || [])[newIndex]);
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const newIndex = Math.max(historyIndex - 1, -1);
                setHistoryIndex(newIndex);
                onChange(newIndex >= 0 ? (history || [])[newIndex] : '');
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
                setHistoryIndex(-1);
            }
        } catch (error) {
            console.error('Error in handleKeyDown:', error);
        }
    }, [historyIndex, history, onChange, onSend]);

    const handleChange = useCallback((e) => {
        try {
            onChange(e.target.value);
        } catch (error) {
            console.error('Error in handleChange:', error);
        }
    }, [onChange]);



    const handleNaturalMode = useCallback(() => setMode('natural'), [setMode]);
    const handleNarseseMode = useCallback(() => setMode('narsese'), [setMode]);

    return (
        <div className="enhanced-input-container">
            <div className="input-header">
                <div className="input-mode-toggle">
                    <button
                        className={`mode-button ${inputMode === 'natural' ? 'active' : ''}`}
                        onClick={() => setMode('natural')}
                        disabled={disabled}
                        title="Switch to natural language mode"
                    >
                        <MessageSquare size={14} /> Natural
                    </button>
                    <button
                        className={`mode-button ${inputMode === 'narsese' ? 'active' : ''}`}
                        onClick={() => setMode('narsese')}
                        disabled={disabled}
                        title="Switch to Narsese mode"
                    >
                        <Code size={14} /> Narsese
                    </button>
                </div>
                {hasSpeechRecognition && (
                    <button
                        className={`voice-button ${isListening ? 'listening' : ''}`}
                        onClick={toggleListening}
                        disabled={disabled}
                        title={disabled ? 'Input disabled' : isListening ? 'Stop listening' : 'Start voice input'}
                    >
                        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                )}
            </div>

            <NarseseInput
                value={value}
                onChange={onChange}
                onSend={onSend}
                history={history}
                disabled={disabled}
                onKeyDown={handleKeyDown}
            />
        </div>
    );
}

EnhancedInput.propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    onSend: PropTypes.func.isRequired,
    history: PropTypes.arrayOf(PropTypes.string).isRequired,
    inputMode: PropTypes.oneOf(['narsese', 'natural']).isRequired,
    setMode: PropTypes.func.isRequired,
};

export default EnhancedInput;