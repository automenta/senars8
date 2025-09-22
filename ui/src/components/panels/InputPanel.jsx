import React, { useState, useEffect } from 'react';
import Panel from '../core/Panel';
import agentService from '../../services/agentService';
import { Send, CornerDownLeft } from 'lucide-react';

function InputPanel() {
    const [inputValue, setInputValue] = useState('');
    const [isConnected, setIsConnected] = useState(agentService.isConnected);

    useEffect(() => {
        const handleStatusChange = (status) => setIsConnected(status === 'connected');
        agentService.on('status', handleStatusChange);
        return () => agentService.off('status', handleStatusChange);
    }, []);

    const handleSend = () => {
        if (inputValue.trim()) {
            agentService.sendUserInput(inputValue);
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
                    placeholder="Enter a goal for the agent..."
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