import React from 'react';
import Panel from '@/components/core/Panel';
import agentService from '@/services/agentService';
import { useConnection } from '@/context/ConnectionContext';
import { Play, Square, RotateCcw, Settings } from 'lucide-react';

function ControlPanel() {
    const { isConnected } = useConnection();

    const handleStart = () => agentService.sendAgentControl('start');
    const handleStop = () => agentService.sendAgentControl('stop');
    const handleReset = () => agentService.sendAgentControl('reset');

    return (
        <Panel title={<><Settings size={18} /> Controls</>}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleStart} title="Start Agent" disabled={!isConnected}><Play size={16} /> Start</button>
                <button onClick={handleStop} title="Stop Agent" disabled={!isConnected}><Square size={16} /> Stop</button>
                <button onClick={handleReset} title="Reset Agent" disabled={!isConnected}><RotateCcw size={16} /> Reset</button>
            </div>
        </Panel>
    );
}

export default ControlPanel;