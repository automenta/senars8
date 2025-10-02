import React, { useState, useEffect, useRef } from 'react';
import agentService from '@/services/agentService';
import demos from '@/generated/demos.json';
import './DemoRunnerPanel.css';

const DemoRunnerPanel = () => {
    const [selectedDemo, setSelectedDemo] = useState(null);
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const outputRef = useRef(null);

    useEffect(() => {
        const handleDemoOutput = ({ data }) => {
            setOutput(prev => prev + data);
        };
        const handleDemoFinished = () => {
            setIsRunning(false);
        };

        agentService.on('demo-output', handleDemoOutput);
        agentService.on('demo-finished', handleDemoFinished);

        return () => {
            agentService.off('demo-output', handleDemoOutput);
            agentService.off('demo-finished', handleDemoFinished);
        };
    }, []);

    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [output]);

    const runDemo = (demo) => {
        setSelectedDemo(demo);
        setIsRunning(true);
        setOutput('');
        agentService.sendMessage('runDemo', { path: demo.path });
    };

    return (
        <div className="demo-runner-panel">
            <div className="demo-list-container">
                <h2>Demos & Tests</h2>
                <ul className="demo-list">
                    {demos.map((demo) => (
                        <li key={demo.id} className={`demo-list-item ${selectedDemo?.id === demo.id ? 'selected' : ''}`}>
                            <button onClick={() => runDemo(demo)} disabled={isRunning}>
                                {demo.name}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="demo-output-container">
                <h2>Output</h2>
                <pre className="demo-output" ref={outputRef}>{output}</pre>
            </div>
        </div>
    );
};

export default DemoRunnerPanel;