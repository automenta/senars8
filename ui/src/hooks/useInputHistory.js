import { useState, useCallback } from 'react';

const useInputHistory = () => {
    const [inputValue, setInputValue] = useState('');
    const [history, setHistory] = useState([]);

    const handleSetInputValue = useCallback((value) => {
        setInputValue(value);
    }, []);

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
