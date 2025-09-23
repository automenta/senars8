import React from 'react';
import { Send } from 'lucide-react';

function SendButton({ onClick, disabled }) {
    return (
        <button onClick={onClick} disabled={disabled} title="Send">
            <Send size={16} />
        </button>
    );
}

export default SendButton;
