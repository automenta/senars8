import React, {useState} from 'react';
import Panel from '@/components/core/Panel';
import NarseseInput from '@/components/ui/NarseseInput';
import SendButton from '@/components/ui/SendButton';
import agentService from '@/services/agentService';
import {useConnection} from '@/context/ConnectionProvider';
import useInputHistory from '@/hooks/useInputHistory';
import {CornerDownLeft, HelpCircle, BookOpen} from 'lucide-react';
import './InputPanel.css';

// Example Narsese statements for quick access
const EXAMPLES = [
    '<robin --> bird>.',
    '<bird --> animal>.',
    '(&&, <robin --> bird>, <robin --> animal>)?',
    '<(*, TOM, book) --> own>.',
    '<(*, book, interesting) --> property>.',
    '<<$x --> bird> ==> <$x --> animal>>?',
    '<bird <-> animal>?',
];

function InputPanel() {
    const {isConnected} = useConnection();
    const {inputValue, setInputValue, history, addToHistory} = useInputHistory();
    const [showExamples, setShowExamples] = useState(false);
    const [validationError, setValidationError] = useState('');

    const validateNarsese = (input) => {
        // Basic validation - check if input ends with '.' or '?'
        const trimmed = input.trim();
        if (trimmed && !trimmed.endsWith('.') && !trimmed.endsWith('?')) {
            return 'Narsese statements should end with "." (judgment) or "?" (question)';
        }
        return '';
    };

    const handleSend = () => {
        if (inputValue.trim()) {
            const error = validateNarsese(inputValue);
            if (error) {
                setValidationError(error);
                return;
            }
            
            setValidationError('');
            agentService.sendNarsese(inputValue);
            addToHistory(inputValue);
        }
    };

    const handleExampleClick = (example) => {
        setInputValue(example);
        setShowExamples(false);
    };

    const handleClear = () => {
        setInputValue('');
        setValidationError('');
    };

    return (
        <Panel title={<><CornerDownLeft size={18}/> User Input</>}>
            <div className="input-panel-wrapper">
                <div className="input-panel-header">
                    <button 
                        className="examples-toggle"
                        onClick={() => setShowExamples(!showExamples)}
                        title="Show/Hide Examples"
                    >
                        <BookOpen size={16} />
                        Examples
                    </button>
                    <button 
                        className="help-toggle"
                        onClick={() => window.open('https://github.com/opennars/OpenNARS-for-Applications/wiki/Narsese-Guide', '_blank')}
                        title="Narsese Guide"
                    >
                        <HelpCircle size={16} />
                        Help
                    </button>
                </div>
                
                {showExamples && (
                    <div className="examples-container">
                        <h4>Common Narsese Examples:</h4>
                        <div className="examples-grid">
                            {EXAMPLES.map((example, index) => (
                                <button
                                    key={index}
                                    className="example-item"
                                    onClick={() => handleExampleClick(example)}
                                >
                                    {example}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {validationError && (
                    <div className="validation-error">
                        {validationError}
                    </div>
                )}
                
                <NarseseInput
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={handleSend}
                    history={history}
                />
                
                <div className="input-panel-actions">
                    <SendButton onClick={handleSend} disabled={!isConnected || !inputValue.trim()} />
                    <button 
                        className="clear-button"
                        onClick={handleClear}
                        disabled={!inputValue.trim()}
                    >
                        Clear
                    </button>
                </div>
                
                {history.length > 0 && (
                    <div className="input-history">
                        <h4>Recent Inputs:</h4>
                        <div className="history-list">
                            {history.slice(0, 3).map((item, index) => (
                                <button
                                    key={index}
                                    className="history-item"
                                    onClick={() => setInputValue(item)}
                                    title={item}
                                >
                                    {item.length > 30 ? `${item.substring(0, 30)}...` : item}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Panel>
    );
}

export default InputPanel;