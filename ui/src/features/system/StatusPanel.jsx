import React, { useState, useEffect } from 'react';
import Panel from 'components/core/Panel';
import agentService from 'services/agentService';
import { useConnection } from 'context/ConnectionContext';
import SonificationToggle from 'components/core/SonificationToggle';
import { Server, Wifi, WifiOff } from 'lucide-react';

function StatusPanel() {
    const { isConnected } = useConnection();
    const [cycleCount, setCycleCount] = useState(0);

    useEffect(() => {
        const handleCycleUpdate = (payload) => setCycleCount(payload.cycleCount);

        agentService.on('system_cycle', handleCycleUpdate);

        return () => {
            agentService.off('system_cycle', handleCycleUpdate);
        };
    }, []);

    return (
        <Panel title={<><Server size={18} /> System Status</>}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isConnected
                        ? <><Wifi size={16} color="limegreen" /> Connected</>
                        : <><WifiOff size={16} color="red" /> Disconnected</>
                    }
                    <span style={{color: '#555'}}>|</span>
                    <span>Cycle: {cycleCount}</span>
                </div>
                <SonificationToggle />
            </div>
        </Panel>
    );
}

export default StatusPanel;