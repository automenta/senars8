import React, {useState} from 'react';
import PropTypes from 'prop-types';
import './NarseseInput.css';

function NarseseInput({value, onChange, onSend, history}) {
    const [historyIndex, setHistoryIndex] = useState(-1);

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

    return (
        <textarea
            className="narsese-input"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            aria-label="NARS input field"
            aria-multiline="true"
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
