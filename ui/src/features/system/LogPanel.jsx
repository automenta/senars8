import React, { useEffect, useRef } from 'react';
import Panel from '@/components/core/Panel';
import { useNarsEventStream } from '@/hooks/useNarsEventStream';
import { ScrollText } from 'lucide-react';

function LogPanel() {
    const messages = useNarsEventStream();
    const logEndRef = useRef(null);

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
                {messages.items.map(({ item }, index) => formatMessage(item, index))}
                <div ref={logEndRef} />
            </pre>
        </Panel>
    );
}

export default LogPanel;