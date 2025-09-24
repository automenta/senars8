import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {Mic, MicOff, MessageSquare, Code} from 'lucide-react';
import './NarseseInput.css'; // Reuse existing input styles

function EnhancedInput({ value, onChange, onSend, history, inputMode = 'narsese', setMode }) {
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
    }, [hasSpeechRecognition]);

    const toggleListening = () => {
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
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const newIndex = Math.min(historyIndex + 1, history.length - 1);
            if (newIndex >= 0) {
                setHistoryIndex(newIndex);
                onChange(history[newIndex]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const newIndex = Math.max(historyIndex - 1, -1);
            setHistoryIndex(newIndex);
            onChange(newIndex >= 0 ? history[newIndex] : '');
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
            setHistoryIndex(-1);
        }
    };

    const handleChange = (e) => {
        onChange(e.target.value);
    };

    const switchMode = () => {
        setMode(inputMode === 'narsese' ? 'natural' : 'narsese');
    };

    return (
        <div className="enhanced-input-container">
            <div className="input-header">
                <div className="input-mode-toggle">
                    <button 
                        className={`mode-button ${inputMode === 'natural' ? 'active' : ''}`}
                        onClick={() => setMode('natural')}
                    >
                        <MessageSquare size={14} /> Natural
                    </button>
                    <button 
                        className={`mode-button ${inputMode === 'narsese' ? 'active' : ''}`}
                        onClick={() => setMode('narsese')}
                    >
                        <Code size={14} /> Narsese
                    </button>
                </div>
                
                {hasSpeechRecognition && (
                    <button 
                        className={`voice-button ${isListening ? 'listening' : ''}`}
                        onClick={toggleListening}
                        title={isListening ? "Stop listening" : "Start voice input"}
                    >
                        {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                    </button>
                )}
            </div>
            
            <textarea
                className="narsese-input"  // Reuse existing CSS
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                aria-label={inputMode === 'natural' ? "Natural language input" : "NARS input field"}
                aria-multiline="true"
                placeholder={inputMode === 'natural' 
                    ? "Ask a question or give a command in natural language..." 
                    : "Enter Narsese statement (e.g., <robin --> bird>.)"
                }
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