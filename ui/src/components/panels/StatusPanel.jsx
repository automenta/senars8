import React, { useState, useEffect } from 'react';
import Panel from '../core/Panel';
import agentService from '../../services/agentService';
import { Server, Wifi, WifiOff } from 'lucide-react';

function StatusPanel() {
    const [isConnected, setIsConnected] = useState(agentService.isConnected);

    useEffect(() => {
        const handleStatusChange = (status) => {
            setIsConnected(status === 'connected');
        };

        agentService.on('status', handleStatusChange);
        return () => {
            agentService.off('status', handleStatusChange);
        };
    }, []);

    return (
        <Panel title={<><Server size={18} /> System Status</>}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isConnected 
                    ? <><Wifi size={16} color="limegreen" /> Connected to Agent</>
                    : <><WifiOff size={16} color="red" /> Disconnected</>
                }
            </div>
            {/* More status indicators can be added here */}
        </Panel>
    );
}

export default StatusPanel;