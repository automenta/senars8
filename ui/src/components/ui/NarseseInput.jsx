import React, {useEffect, useRef, useState} from 'react';
import './NarseseInput.css';

const highlightSyntax = (text) => {
    return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\(/g, '<span class="paren">(</span>')
        .replace(/\)/g, '<span class="paren">)</span>');
};

function NarseseInput({value, onChange, onSend, history}) {
    const [historyIndex, setHistoryIndex] = useState(-1);
    const editorRef = useRef(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== highlightSyntax(value)) {
            editorRef.current.innerHTML = highlightSyntax(value);
        }
    }, [value]);

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

    const handleInput = (e) => {
        onChange(e.currentTarget.textContent);
    };

    return (
        <div
            ref={editorRef}
            className="narsese-input"
            contentEditable="true"
            onInput={handleInput}
            onKeyDown={handleKeyDown}
        />
    );
}

export default NarseseInput;
