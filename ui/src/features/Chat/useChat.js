import {useEffect, useState} from 'react';
import agentService from '../../services/agentService.js';

const useChat = () => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        const handleMessage = (message) => {
            if (message.type === 'chat') {
                setMessages((prevMessages) => [...prevMessages, {text: message.content, sender: 'agent'}]);
            }
        };

        agentService.on('message', handleMessage);

        return () => {
            agentService.off('message', handleMessage);
        };
    }, []);

    const handleSendMessage = () => {
        if (inputValue.trim()) {
            const newMessage = {text: inputValue, sender: 'user'};
            setMessages((prevMessages) => [...prevMessages, newMessage]);
            agentService.send({type: 'chat', content: inputValue});
            setInputValue('');
        }
    };

    return {messages, inputValue, setInputValue, handleSendMessage};
};

export default useChat;