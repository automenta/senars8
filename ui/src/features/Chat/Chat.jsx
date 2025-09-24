import React from 'react';
import { Panel, EnhancedInput, SendButton } from '@ui/components';
import useChat from './useChat';
import './Chat.css';

const Chat = () => {
    const { messages, inputValue, setInputValue, handleSendMessage } = useChat();

    return (
        <Panel title="Chat">
            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.sender}`}>
                        {msg.text}
                    </div>
                ))}
            </div>
            <div className="chat-input">
                <EnhancedInput
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onEnter={handleSendMessage}
                    placeholder="Type a message..."
                />
                <SendButton onClick={handleSendMessage} />
            </div>
        </Panel>
    );
};

export default Chat;