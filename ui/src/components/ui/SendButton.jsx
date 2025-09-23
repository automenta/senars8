import React from 'react';
import {Send} from 'lucide-react';
import './SendButton.css';

function SendButton({onClick, disabled}) {
    return (
        <button onClick={onClick} disabled={disabled} title="Send" className="send-button">
            <Send size={16}/>
        </button>
    );
}

export default SendButton;