import React, {useEffect, useState} from 'react';
import {Panel, SonificationToggle} from '@/components';
import {useConnection} from '@/context/useConnection';
import agentService from '@/services/agentService';
import notificationService from '@/services/notificationService';
import log from '@common/utils/logger';
import {Activity, BarChart2, Database, RotateCcw, Server, Thermometer, Wifi, WifiOff, Zap} from 'lucide-react';
import './StatusPanel.css';

function StatusPanel() {
    const {isConnected, connectionStatus, connectionError, reconnect} = useConnection();
    const [systemStats, setSystemStats] = useState({
        cycleCount: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        temperature: 0,
        beliefs: 0,
        goals: 0,
        questions: 0,
        isRunning: false,
    });
    const [connectionStats, setConnectionStats] = useState(null);

    useEffect(() => {
        const handleConnectionStats = (stats) => {
            setConnectionStats(stats);
        };

        const handleStatsUpdate = (stats) => {
            setSystemStats(prev => ({...prev, ...stats}));
        };

        const handleError = (error) => {
            log.error('StatusPanel error:', error);
            notificationService.addError('Status Panel Error', 'Error receiving status updates.');
        };

        agentService.on('connection_stats', handleConnectionStats);
        agentService.on('system_stats', handleStatsUpdate);
        agentService.on('error', handleError);

        // Fetch initial stats
        if (isConnected) {
            agentService.sendMessage('get_system_stats', {});
        }

        // Setup periodic updates
        const interval = setInterval(() => {
            if (isConnected) {
                agentService.sendMessage('get_system_stats', {});
            }
        }, 3000); // Update every 3 seconds

        return () => {
            agentService.off('connection_stats', handleConnectionStats);
            agentService.off('system_stats', handleStatsUpdate);
            agentService.off('error', handleError);
            clearInterval(interval);
        };
    }, [isConnected]);

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    return (
        <Panel title={<><Server size={18}/> Status</>}>
            <div className="status-panel-content">
                <div className={`status-item connection-status ${connectionStatus}`}>
                    {isConnected ? (
                        <><Wifi size={16} color="limegreen"/> Connected</>
                    ) : (
                        <><WifiOff size={16} color="red"/> Disconnected</>
                    )}
                </div>

                {!isConnected && (
                    <div className="status-item">
                        <button onClick={reconnect} className="reconnect-button-status" title="Reconnect to agent">
                            <RotateCcw size={16}/> Reconnect
                        </button>
                    </div>
                )}

                <div className="status-item">
                    <Activity size={16}/>
                    <span>Cycle: {systemStats.cycleCount.toLocaleString()}</span>
                </div>

                <div className="status-item">
                    <Database size={16}/>
                    <span>Memory: {formatBytes(systemStats.memoryUsage)}</span>
                </div>

                <div className="status-item">
                    <Zap size={16}/>
                    <span>CPU: {systemStats.cpuUsage?.toFixed(1) || 0}%</span>
                </div>

                <div className="status-item">
                    <Thermometer size={16}/>
                    <span>Temp: {systemStats.temperature?.toFixed(2) || 0}</span>
                </div>

                <div className="status-item">
                    <Database size={16}/>
                    <span>Beliefs: {systemStats.beliefs?.toLocaleString() || 0}</span>
                </div>

                <div className="status-item">
                    <Zap size={16}/>
                    <span>Goals: {systemStats.goals?.toLocaleString() || 0}</span>
                </div>

                <div className={`status-item agent-status ${systemStats.isRunning ? 'running' : 'stopped'}`}>
                    <Activity size={16}/>
                    <span>Agent: {systemStats.isRunning ? 'Running' : 'Stopped'}</span>
                </div>

                <div className="status-item">
                    <Zap size={16}/>
                    <span>Questions: {(systemStats.questions || 0).toLocaleString()}</span>
                </div>

                <div className="status-item sonification-toggle">
                    <SonificationToggle/>
                </div>

                {connectionStats && (
                    <>
                        <div className="status-item">
                            <BarChart2 size={16}/>
                            <span>Conn: {connectionStats.totalConnections}</span>
                        </div>
                        <div className="status-item">
                            <BarChart2 size={16}/>
                            <span>Reconn: {connectionStats.reconnectAttempts}</span>
                        </div>
                        <div className="status-item">
                            <BarChart2 size={16}/>
                            <span>Fail: {connectionStats.totalFailedConnections}</span>
                        </div>
                    </>
                )}

                {connectionError && (
                    <div className="status-item connection-error">
                        <span
                            className="error-text">Error: {connectionError.message || connectionError.toString()}</span>
                    </div>
                )}
            </div>
        </Panel>
    );
}

export default StatusPanel;