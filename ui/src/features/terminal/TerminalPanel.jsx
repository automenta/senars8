import React, {useRef, useEffect, useState} from 'react';
import {ReactTerminal} from 'react-xtermjs';
import {Terminal} from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import {useConnection} from '@/context/ConnectionProvider';

const TerminalPanel = () => {
    const terminalRef = useRef(null);
    const {sendMessage, lastMessage} = useConnection();
    const [input, setInput] = useState('');

    useEffect(() => {
        if (terminalRef.current) {
            const terminal = terminalRef.current.terminal;
            terminal.write('Welcome to the Web IDE Terminal!\r\n');
            terminal.write('$ ');
        }
    }, []);

    useEffect(() => {
        if (lastMessage) {
            const message = JSON.parse(lastMessage.data);
            if (message.type === 'commandOutput') {
                const terminal = terminalRef.current.terminal;
                terminal.write('\r\n' + message.payload.stdout);
                terminal.write(message.payload.stderr);
                terminal.write('$ ');
            }
        }
    }, [lastMessage]);

    const onData = (data) => {
        const terminal = terminalRef.current.terminal;
        terminal.write(data);
        if (data === '\r') { // Enter key pressed
            sendMessage('runCommand', {command: input});
            setInput('');
        } else if (data === '\x7f') { // Backspace
            if (input.length > 0) {
                setInput(prev => prev.slice(0, -1));
            }
        } else {
            setInput(prev => prev + data);
        }
    };

    return (
        <div style={{width: '100%', height: '100%', overflow: 'hidden'}}>
            <ReactTerminal
                ref={terminalRef}
                options={{
                    theme: {
                        background: '#1e1e1e',
                        foreground: '#cccccc',
                    },
                    cursorBlink: true,
                    scrollback: 1000,
                }}
                onData={onData}
            />
        </div>
    );
};

export default TerminalPanel;