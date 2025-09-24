import React, {useState} from 'react';
import PropTypes from 'prop-types';
import './NarseseInput.css';

function NarseseInput({value, onChange, onSend, history, disabled = false}) {
    const [historyIndex, setHistoryIndex] = useState(-1);

    const handleKeyDown = (e) => {
        if (disabled) return;
        
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
    };

    const handleChange = (e) => {
        try {
            onChange(e.target.value);
        } catch (error) {
            console.error('Error in handleChange:', error);
        }
    };

    return (
        <textarea
            value={value}
            onChange={(e) => !disabled && onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`narsese-input ${disabled ? 'disabled' : ''}`}
            placeholder={disabled ? "Input disabled..." : "Enter Narsese statement or natural language query..."}
            spellCheck="false"
            disabled={disabled}
        />
    );
}

NarseseInput.propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    onSend: PropTypes.func.isRequired,
    history: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default NarseseInput;
