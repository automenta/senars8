import React, { useState, useEffect } from 'react';
import Panel from '../core/Panel';
import agentService from '../../services/agentService';
import { Server, Wifi, WifiOff } from 'lucide-react';

function StatusPanel() {
    const [isConnected, setIsConnected] = useState(agentService.isConnected);
    const [cycleCount, setCycleCount] = useState(0);

    useEffect(() => {
        const handleStatusChange = (status) => setIsConnected(status === 'connected');
        const handleCycleUpdate = (payload) => setCycleCount(payload.cycleCount);

        agentService.on('status', handleStatusChange);
        agentService.on('system_cycle', handleCycleUpdate);

        return () => {
            agentService.off('status', handleStatusChange);
            agentService.off('system_cycle', handleCycleUpdate);
        };
    }, []);

    return (
        <Panel title={<><Server size={18} /> System Status</>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isConnected
                        ? <><Wifi size={16} color="limegreen" /> Connected</>
                        : <><WifiOff size={16} color="red" /> Disconnected</>
                    }
                </div>
                <div>
                    <strong>Cycle:</strong> {cycleCount}
                </div>
            </div>
        </Panel>
    );
}

export default StatusPanel;