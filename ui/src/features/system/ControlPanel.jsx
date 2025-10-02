import React from 'react';
import {Panel} from '@/components';
import agentService from '@/services/agentService';
import notificationService from '@/services/notificationService';
import {useConnection} from '@/context/useConnection';
import {Play, RotateCcw, Settings, Square} from 'lucide-react';
import './ControlPanel.css';

function ControlPanel() {
    const {isConnected} = useConnection();

    const handleStart = () => {
        try {
            agentService.sendAgentControl('start');
            notificationService.addInfo('Agent Control', 'Start command sent to agent');
        } catch (error) {
            notificationService.addError('Agent Control Error', `Failed to start agent: ${error.message}`);
        }
    };

    const handleStop = () => {
        try {
            agentService.sendAgentControl('stop');
            notificationService.addInfo('Agent Control', 'Stop command sent to agent');
        } catch (error) {
            notificationService.addError('Agent Control Error', `Failed to stop agent: ${error.message}`);
        }
    };

    const handleReset = () => {
        try {
            agentService.sendAgentControl('reset');
            notificationService.addWarning('Agent Control', 'Reset command sent to agent - all memory cleared');
        } catch (error) {
            notificationService.addError('Agent Control Error', `Failed to reset agent: ${error.message}`);
        }
    };

    return (
        <Panel title={<><Settings size={18}/> Controls</>}>
            <div className="control-panel-buttons">
                <button onClick={handleStart} title="Start Agent" disabled={!isConnected}><Play size={16}/> Start
                </button>
                <button onClick={handleStop} title="Stop Agent" disabled={!isConnected}><Square size={16}/> Stop
                </button>
                <button onClick={handleReset} title="Reset Agent" disabled={!isConnected}><RotateCcw size={16}/> Reset
                </button>
            </div>
        </Panel>
    );
}

export default ControlPanel;