import React from 'react';
import Panel from '../core/Panel';
import agentService from '../../services/agentService';
import { Play, Square, RotateCcw, Settings } from 'lucide-react';

function ControlPanel() {
    const handleStart = () => agentService.sendAgentControl('start');
    const handleStop = () => agentService.sendAgentControl('stop');
    const handleReset = () => agentService.sendAgentControl('reset');

    return (
        <Panel title={<><Settings size={18} /> Controls</>}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleStart} title="Start Agent"><Play size={16} /> Start</button>
                <button onClick={handleStop} title="Stop Agent"><Square size={16} /> Stop</button>
                <button onClick={handleReset} title="Reset Agent"><RotateCcw size={16} /> Reset</button>
            </div>
        </Panel>
    );
}

export default ControlPanel;