import React from 'react';
import Panel from '@/components/core/Panel';
import NarseseInput from '@/components/ui/NarseseInput';
import SendButton from '@/components/ui/SendButton';
import agentService from '@/services/agentService';
import {useConnection} from '@/context/useConnection';
import useInputHistory from '@/hooks/useInputHistory';
import {CornerDownLeft} from 'lucide-react';
import './InputPanel.css';

function InputPanel() {
    const {isConnected} = useConnection();
    const {inputValue, setInputValue, history, addToHistory} = useInputHistory();

    const handleSend = () => {
        if (inputValue.trim()) {
            agentService.sendNarsese(inputValue);
            addToHistory(inputValue);
            setInputValue('');
        }
    };

    return (
        <Panel title={<><CornerDownLeft size={18}/> User Input</>}>
            <div className="input-panel-wrapper">
                <NarseseInput
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={handleSend}
                    history={history}
                />
                <SendButton onClick={handleSend} disabled={!isConnected}/>
            </div>
        </Panel>
    );
}

export default InputPanel;