import React, {useEffect, useState} from 'react';
import {Panel, SonificationToggle} from '@ui/components';
import {useConnection} from '@/context/useConnection';
import agentService from '@/services/agentService';
import notificationService from '@/services/notificationService';
import log from '@/utils/logger';
import {Activity, BarChart2, Database, RotateCcw, Server, Thermometer, Wifi, WifiOff, Zap} from 'lucide-react';
import {MESSAGE_TYPES} from '@/constants/ui';
import './StatusPanel.css';

function StatusPanel() {
    const {isConnected, connectionStatus, connectionError, reconnect} = useConnection();
    const [systemStats, setSystemStats] = useState({
        cycleCount: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        temperature: 0,
        beliefs: 0,
        goals: 0
    });
    const [connectionStats, setConnectionStats] = useState({
        totalConnections: 0,
        totalFailedConnections: 0,
        totalReconnections: 0,
        lastConnectionAttempt: null,
        lastSuccessfulConnection: null,
        lastDisconnection: null
    });

    useEffect(() => {
        // Listen for connection stats updates
        const handleConnectionStats = (stats) => {
            setConnectionStats(stats);
        };

        const handleConnectionStatsError = (error) => {
            log.error('Error in connection stats:', error);
            notificationService.addError('Connection Stats Error', 'Error receiving connection statistics');
        };

        agentService.on('connection_stats', handleConnectionStats);
        agentService.on('error', handleConnectionStatsError);

        const handleCycleUpdate = (payload) => {
            try {
                setSystemStats(prev => ({
                    ...prev,
                    cycleCount: payload.cycleCount || prev.cycleCount
                }));
            } catch (error) {
                log.error('Error updating cycle stats:', error);
                notificationService.addError('System Stats Error', 'Error updating system statistics');
            }
        };

        const handleStatsUpdate = (stats) => {
            try {
                setSystemStats(prev => ({
                    ...prev,
                    ...stats
                }));
            } catch (error) {
                log.error('Error updating system stats:', error);
                notificationService.addError('System Stats Error', 'Error updating system statistics');
            }
        };

        const handleStatsError = (error) => {
            log.error('Error in system stats:', error);
            notificationService.addError('System Stats Error', 'Error receiving system statistics');
        };

        agentService.on('system_cycle', handleCycleUpdate);
        agentService.on('system_stats', handleStatsUpdate);
        agentService.on('error', handleStatsError);

        const getSystemStats = () => {
            agentService.sendMessage(MESSAGE_TYPES.SYSTEM_STATS, {}, {expectResponse: true, timeout: 5000});
        };

        // Set up periodic updates
        const interval = setInterval(() => {
            try {
                agentService.sendMessage('get_system_stats', {});
            } catch (error) {
                log.error('Failed to request stats update:', error);
            }
        }, 3000); // Update every 3 seconds

        return () => {
            agentService.off('connection_stats', handleConnectionStats);
            agentService.off('system_cycle', handleCycleUpdate);
            agentService.off('system_stats', handleStatsUpdate);
            agentService.off('error', handleConnectionStatsError);
            agentService.off('error', handleStatsError);
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
        <Panel title={<><Server size={18}/> Status</>}>
            <div className="status-panel-content">
                {/* Connection Status */}
                <div className={`status-item connection-status ${connectionStatus}`}>
                    {connectionStatus === 'connected' ? (
                        <><Wifi size={16} color="limegreen"/> Connected</>
                    ) : connectionStatus === 'connecting' ? (
                        <><Wifi size={16} color="orange"/> Connecting...</>
                    ) : connectionStatus === 'failed' ? (
                        <><WifiOff size={16} color="red"/> Connection Failed</>
                    ) : (
                        <><WifiOff size={16} color="gray"/> Disconnected</>
                    )}
                </div>

                {/* Reconnect Button */}
                {!isConnected && connectionStatus !== 'disconnected' && (
                    <div className="status-item">
                        <button
                            onClick={reconnect}
                            className="reconnect-button-status"
                            title="Reconnect to agent"
                        >
                            <RotateCcw size={16}/> Reconnect
                        </button>
                    </div>
                )}

                {/* Cycle Counter */}
                <div className="status-item">
                    <Activity size={16}/>
                    <span>Cycle: {systemStats.cycleCount.toLocaleString()}</span>
                </div>

                {/* Memory Usage */}
                <div className="status-item">
                    <Database size={16}/>
                    <span>Memory: {formatBytes(systemStats.memoryUsage)}</span>
                </div>

                {/* CPU Usage */}
                <div className="status-item">
                    <Zap size={16}/>
                    <span>CPU: {systemStats.cpuUsage.toFixed(1)}%</span>
                </div>

                {/* Temperature */}
                <div className="status-item">
                    <Thermometer size={16}/>
                    <span>Temp: {systemStats.temperature.toFixed(2)}</span>
                </div>

                {/* Beliefs Count */}
                <div className="status-item">
                    <Database size={16}/>
                    <span>Beliefs: {systemStats.beliefs.toLocaleString()}</span>
                </div>

                {/* Goals Count */}
                <div className="status-item">
                    <Zap size={16}/>
                    <span>Goals: {systemStats.goals.toLocaleString()}</span>
                </div>

                {/* Sonification Toggle */}
                <div className="status-item sonification-toggle">
                    <SonificationToggle/>
                </div>

                {/* Connection Statistics */}
                <div className="status-item">
                    <BarChart2 size={16}/>
                    <span>Conn: {connectionStats.totalConnections}</span>
                </div>

                <div className="status-item">
                    <BarChart2 size={16}/>
                    <span>Reconn: {connectionStats.totalReconnections}</span>
                </div>

                <div className="status-item">
                    <BarChart2 size={16}/>
                    <span>Fail: {connectionStats.totalFailedConnections}</span>
                </div>

                {/* Connection Error Display */}
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