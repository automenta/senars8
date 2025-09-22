import React, {useEffect, useState} from 'react';
import Status from './components/Status';
import Controls from './components/Controls';
import Input from './components/Input';
import Log from './components/Log';
import useWebSocket from './hooks/useWebSocket';
import './App.css';

function App() {
    // Hardcoded for now, will be configurable later
    const AGENT_URL = 'ws://localhost:8080';

    const {isConnected, lastMessage, sendMessage} = useWebSocket(AGENT_URL);
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        if (lastMessage !== null) {
            // For now, just log the raw message.
            // Later, we can parse it and display it more nicely.
            setMessages((prevMessages) => [...prevMessages, `[AGENT] ${lastMessage}`]);
        }
    }, [lastMessage]);

    const handleUserInput = (input) => {
        setMessages((prevMessages) => [...prevMessages, `[USER] ${input}`]);
        sendMessage(input);
    };

    return (
        <div className="app-container">
            <header>
                <h1>Agent UI</h1>
            </header>
            <main>
                <div className="top-panels">
                    <Status isConnected={isConnected}/>
                    <Controls/>
                </div>
                <div className="bottom-panels">
                    <Input sendMessage={handleUserInput} isConnected={isConnected}/>
                    <Log messages={messages}/>
                </div>
            </main>
        </div>
    );
}

export default App;
