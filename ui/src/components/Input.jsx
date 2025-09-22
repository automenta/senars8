import React, {useState} from 'react';

function Input({sendMessage, isConnected}) {
    const [inputValue, setInputValue] = useState('');

    const handleSend = () => {
        if (inputValue.trim()) {
            sendMessage(inputValue);
            setInputValue('');
        }
    };

    return (
        <div className="input-panel">
            <h2>Input</h2>
            <textarea
                placeholder="Enter Narsese input..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={!isConnected}
            ></textarea>
            <button onClick={handleSend} disabled={!isConnected}>
                Send
            </button>
        </div>
    );
}

export default Input;
