import React, {useEffect, useRef, useState} from 'react';
import {ReactTerminal} from 'react-xtermjs';
import '@xterm/xterm/css/xterm.css';
import {useConnection} from '@/context/useConnection';
import {useSharedState} from '@/context/useSharedState';
import './TerminalPanel.css';

const TerminalPanel = () => {
    const terminalRef = useRef(null);
    const {sendMessage, lastMessage} = useConnection();
    const {_yDoc} = useSharedState();
    const [input, setInput] = useState('');
    const [commandHistory, setCommandHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    useEffect(() => {
        if (terminalRef.current) {
            const terminal = terminalRef.current.terminal;
            terminal.write('SeNARS Terminal - Type "help" for available commands\r\n');
            terminal.write('$ ');
        }
    }, []);

    useEffect(() => {
        if (lastMessage) {
            const messageParsed = typeof lastMessage.data === 'string'
                ? JSON.parse(lastMessage.data)
                : lastMessage.data;

            if (messageParsed.type === 'commandOutput') {
                const terminal = terminalRef.current.terminal;
                terminal.write('\r\n' + (messageParsed.payload.stdout || ''));
                if (messageParsed.payload.stderr) {
                    terminal.write(messageParsed.payload.stderr);
                }
                terminal.write('$ ');
            } else if (messageParsed.type === 'narseseOutput') {
                // Handle Narsese-specific output
                const terminal = terminalRef.current.terminal;
                terminal.write('\r\n' + (messageParsed.payload || ''));
                terminal.write('$ ');
            }
        }
    }, [lastMessage]);

    const executeCommand = (command) => {
        // Add to command history
        setCommandHistory(prev => [command, ...prev]);
        setHistoryIndex(-1);

        // Process special commands locally
        if (command === 'clear' || command === 'cls') {
            const terminal = terminalRef.current.terminal;
            terminal.clear();
            return;
        }

        if (command === 'help') {
            const terminal = terminalRef.current.terminal;
            terminal.write('\r\nAvailable commands:\r\n');
            terminal.write('- clear/cls: Clear the terminal\r\n');
            terminal.write('- help: Show this help message\r\n');
            terminal.write('- run_narsese <statement>: Execute a Narsese statement\r\n');
            terminal.write('- Other commands are executed via backend\r\n');
            terminal.write('$ ');
            return;
        }

        // Handle run_narsese command
        if (command.startsWith('run_narsese ')) {
            const narseseStatement = command.substring('run_narsese '.length).trim();
            if (narseseStatement) {
                // Send to agent service directly
                sendMessage('narsese', narseseStatement);
                const terminal = terminalRef.current.terminal;
                terminal.write(`\r\nExecuting: ${narseseStatement}\r\n$ `);
            }
            return;
        }

        // Send to backend for processing
        sendMessage('runCommand', {command});
    };

    const onData = (data) => {
        const terminal = terminalRef.current.terminal;

        if (data === '\r') { // Enter key pressed
            if (input.trim()) {
                // Write the full command to terminal
                terminal.write('\r\n' + input);
                executeCommand(input);
            } else {
                terminal.write('\r\n$ '); // Just add new prompt for empty command
            }
            setInput('');
        } else if (data === '\x7f') { // Backspace
            if (input.length > 0) {
                setInput(prev => prev.slice(0, -1));
                // Move cursor back and delete character
                terminal.write('\b \b');
            }
        } else if (data === '\x1b[A') { // Up arrow
            if (commandHistory.length > 0) {
                const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : commandHistory.length - 1;
                const prevCommand = commandHistory[newIndex];

                // Clear current input display and show previous command
                for (let i = 0; i < input.length; i++) {
                    terminal.write('\b \b');
                }

                setInput(prevCommand);
                terminal.write(prevCommand);
                setHistoryIndex(newIndex);
            }
        } else if (data === '\x1b[B') { // Down arrow
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                const nextCommand = commandHistory[newIndex] || '';

                // Clear current input display and show next command
                for (let i = 0; i < input.length; i++) {
                    terminal.write('\b \b');
                }

                setInput(nextCommand);
                terminal.write(nextCommand);
                setHistoryIndex(newIndex);
            } else if (historyIndex === 0) {
                // Go back to empty input
                for (let i = 0; i < input.length; i++) {
                    terminal.write('\b \b');
                }
                setInput('');
                setHistoryIndex(-1);
            }
        } else {
            setInput(prev => prev + data);
        }
    };

    return (
        <div className="terminal-panel">
            <div className="terminal-header">
                <span>Terminal</span>
            </div>
            <ReactTerminal
                ref={terminalRef}
                options={{
                    theme: {
                        background: '#1e1e1e',
                        foreground: '#cccccc',
                        selection: '#4a90e280',
                    },
                    cursorBlink: true,
                    scrollback: 5000,
                    fontSize: 14,
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                }}
                onData={onData}
            />
        </div>
    );
};

export default TerminalPanel;