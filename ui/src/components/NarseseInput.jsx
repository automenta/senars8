import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import './NarseseInput.css';

function NarseseInput({value, onChange, onSend, history, disabled = false, onKeyDown}) {
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
                if (newIndex === -1) {
                    setHistoryIndex(-1);
                    onChange('');
                } else {
                    setHistoryIndex(newIndex);
                    onChange((history || [])[newIndex]);
                }
            } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onSend(value);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onChange(''); // Clear input
                setHistoryIndex(-1);
            }
        } catch (error) {
            console.error('Error handling key event:', error);
        }
    };

    // Keyboard shortcut handler for the entire component
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (disabled) return;

            // Focus input with Ctrl/Cmd + Shift + I
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
                e.preventDefault();
                document.querySelector('.narsese-input')?.focus();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [disabled]);

    return (
        <textarea
            className="narsese-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
                // Call the prop handler if provided, otherwise use default handler
                // Only call default handler if the prop handler doesn't prevent default behavior
                if (onKeyDown) {
                    onKeyDown(e);
                    // If the prop handler didn't prevent default, we still want to run default handler
                    // for other keys like arrow keys
                    if (!e.defaultPrevented) {
                        handleKeyDown(e);
                    }
                } else {
                    // Use default handler if no prop handler provided
                    handleKeyDown(e);
                }
            }}
            disabled={disabled}
            placeholder="Enter Narsese... (Ctrl/Cmd+Enter to send, ↑↓ for history, Esc to clear)"
            aria-label="Narsese input"
            title="Narsese input (Ctrl/Cmd+Enter to send, ↑↓ for history, Esc to clear)"
            rows={3}
        />
    );
}

NarseseInput.propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    onSend: PropTypes.func.isRequired,
    history: PropTypes.array,
    disabled: PropTypes.bool,
    onKeyDown: PropTypes.func,
};

export default NarseseInput;
