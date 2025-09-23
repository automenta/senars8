import React, { useState } from 'react';
import Panel from '@/components/core/Panel';
import NarseseInput from '@/components/ui/NarseseInput';
import SendButton from '@/components/ui/SendButton';
import agentService from '@/services/agentService';
import { useConnection } from '@/context/ConnectionContext';
import { CornerDownLeft } from 'lucide-react';

function InputPanel() {
    const { isConnected } = useConnection();
    const [inputValue, setInputValue] = useState('');
    const [history, setHistory] = useState([]);

    const handleSend = () => {
        if (inputValue.trim()) {
            agentService.sendNarsese(inputValue);
            setHistory(prevHistory => [inputValue, ...prevHistory]);
            setInputValue('');
        }
    };

    return (
        <Panel title={<><CornerDownLeft size={18} /> User Input</>}>
            <div className="input-panel-wrapper">
                <NarseseInput
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={handleSend}
                    history={history}
                />
                <SendButton onClick={handleSend} disabled={!isConnected} />
            </div>
        </Panel>
    );
}

export default InputPanel;