import {useCallback, useContext, useState} from 'react';
import {SharedStateContext} from '../context/SharedStateContext';
import {useYText} from './useYText';

const useInputHistory = () => {
    const {yDoc} = useContext(SharedStateContext);
    const yText = yDoc.getText('input');
    const [inputValue, setInputValue] = useYText(yText);
    const [history, setHistory] = useState([]);

    const handleSetInputValue = useCallback((value) => {
        setInputValue(value);
    }, [setInputValue]);

    const addToHistory = useCallback((command) => {
        if (command.trim()) {
            setHistory(prevHistory => [command, ...prevHistory]);
        }
    }, []);

    return {
        inputValue,
        setInputValue: handleSetInputValue,
        history,
        addToHistory,
    };
};

export default useInputHistory;
