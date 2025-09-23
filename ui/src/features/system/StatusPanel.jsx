import React, {useEffect, useState} from 'react';
import Panel from '@/components/core/Panel';
import agentService from '@/services/agentService';
import {useConnection} from '@/context/ConnectionProvider';
import SonificationToggle from '@/components/core/SonificationToggle';
import {Server, Wifi, WifiOff, Activity, Database, Zap, Thermometer} from 'lucide-react';
import './StatusPanel.css';

function StatusPanel() {
    const {isConnected} = useConnection();
    const [systemStats, setSystemStats] = useState({
        cycleCount: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        temperature: 0,
        beliefs: 0,
        goals: 0
    });

    useEffect(() => {
        const handleCycleUpdate = (payload) => {
            setSystemStats(prev => ({
                ...prev,
                cycleCount: payload.cycleCount || prev.cycleCount
            }));
        };

        const handleStatsUpdate = (stats) => {
            setSystemStats(prev => ({
                ...prev,
                ...stats
            }));
        };

        agentService.on('system_cycle', handleCycleUpdate);
        agentService.on('system_stats', handleStatsUpdate);

        // Request initial stats
        agentService.sendMessage('get_system_stats', {});

        // Set up periodic updates
        const interval = setInterval(() => {
            agentService.sendMessage('get_system_stats', {});
        }, 3000); // Update every 3 seconds

        return () => {
            agentService.off('system_cycle', handleCycleUpdate);
            agentService.off('system_stats', handleStatsUpdate);
            clearInterval(interval);
        };
    }, []);

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <Panel title={<><Server size={18}/> System Status</>}>
            <div className="status-panel-content">
                {/* Connection Status */}
                <div className="status-item connection-status">
                    {isConnected
                        ? <><Wifi size={16} color="limegreen"/> Connected</>
                        : <><WifiOff size={16} color="red"/> Disconnected</>
                    }
                </div>

                {/* Cycle Counter */}
                <div className="status-item">
                    <Activity size={16} />
                    <span>Cycle: {systemStats.cycleCount.toLocaleString()}</span>
                </div>

                {/* Memory Usage */}
                <div className="status-item">
                    <Database size={16} />
                    <span>Memory: {formatBytes(systemStats.memoryUsage)}</span>
                </div>

                {/* CPU Usage */}
                <div className="status-item">
                    <Zap size={16} />
                    <span>CPU: {systemStats.cpuUsage.toFixed(1)}%</span>
                </div>

                {/* Temperature */}
                <div className="status-item">
                    <Thermometer size={16} />
                    <span>Temp: {systemStats.temperature.toFixed(2)}</span>
                </div>

                {/* Beliefs Count */}
                <div className="status-item">
                    <Database size={16} />
                    <span>Beliefs: {systemStats.beliefs.toLocaleString()}</span>
                </div>

                {/* Goals Count */}
                <div className="status-item">
                    <Zap size={16} />
                    <span>Goals: {systemStats.goals.toLocaleString()}</span>
                </div>

                {/* Sonification Toggle */}
                <div className="status-item sonification-toggle">
                    <SonificationToggle />
                </div>
            </div>
        </Panel>
    );
}

export default StatusPanel;