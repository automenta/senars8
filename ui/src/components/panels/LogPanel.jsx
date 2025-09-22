import React, { useState, useEffect, useRef } from 'react';
import Panel from '../core/Panel';
import agentService from '../../services/agentService';
import { ScrollText } from 'lucide-react';

function LogPanel() {
    const [messages, setMessages] = useState([]);
    const logEndRef = useRef(null);

    useEffect(() => {
        const handleMessage = (message) => {
            setMessages(prev => [...prev, message]);
        };

        agentService.on('message', handleMessage);
        return () => agentService.off('message', handleMessage);
    }, []);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatMessage = (msg, index) => {
        const { type, payload, source } = msg;
        const time = new Date().toLocaleTimeString();
        let content = '';
        if (typeof payload === 'object' && payload !== null) {
            content = JSON.stringify(payload);
        } else {
            content = payload;
        }
        
        const sourceName = source || (type === 'narsese' ? 'user' : 'system');

        return (
            <div key={index} className={`log-message log-${sourceName}`}>
                <span className="log-time">{time}</span>
                <span className="log-source">{sourceName}</span>
                <span className="log-content">{content}</span>
            </div>
        );
    };

    return (
        <Panel title={<><ScrollText size={18} /> Event Log</>}>
            <pre className="log-container">
                {messages.map(formatMessage)}
                <div ref={logEndRef} />
            </pre>
        </Panel>
    );
}

export default LogPanel;