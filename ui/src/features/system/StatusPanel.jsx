import React, {useEffect, useState} from 'react';
import Panel from '@/components/core/Panel';
import agentService from '@/services/agentService';
import {useConnection} from '@/context/ConnectionProvider';
import SonificationToggle from '@/components/core/SonificationToggle';
import {Server, Wifi, WifiOff} from 'lucide-react';
import './StatusPanel.css';

function StatusPanel() {
    const {isConnected} = useConnection();
    const [cycleCount, setCycleCount] = useState(0);

    useEffect(() => {
        const handleCycleUpdate = (payload) => setCycleCount(payload.cycleCount);

        agentService.on('system_cycle', handleCycleUpdate);

        return () => {
            agentService.off('system_cycle', handleCycleUpdate);
        };
    }, []);

    return (
        <Panel title={<><Server size={18}/> System Status</>}>
            <div className="status-panel-content">
                <div className="status-panel-connection">
                    {isConnected
                        ? <><Wifi size={16} color="limegreen"/> Connected</>
                        : <><WifiOff size={16} color="red"/> Disconnected</>
                    }
                    <span className="status-panel-divider">|</span>
                    <span>Cycle: {cycleCount}</span>
                </div>
                <SonificationToggle/>
            </div>
        </Panel>
    );
}

export default StatusPanel;