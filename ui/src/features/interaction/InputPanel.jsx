import React, { useState } from 'react';
import Panel from '@/components/core/Panel';
import agentService from '@/services/agentService';
import { useConnection } from '@/context/ConnectionContext';
import { Send, CornerDownLeft } from 'lucide-react';

function InputPanel() {
    const [inputValue, setInputValue] = useState('');
    const { isConnected } = useConnection();

    const handleSend = () => {
        if (inputValue.trim()) {
            agentService.sendNarsese(inputValue);
            setInputValue('');
        }
    };
    
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    return (
        <Panel title={<><CornerDownLeft size={18} /> User Input</>}>
            <div className="input-wrapper">
                <textarea
                    placeholder="Enter Narsese input, e.g. <cat --> animal>."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!isConnected}
                ></textarea>
                <button onClick={handleSend} disabled={!isConnected} title="Send">
                    <Send size={16} />
                </button>
            </div>
        </Panel>
    );
}

export default InputPanel;