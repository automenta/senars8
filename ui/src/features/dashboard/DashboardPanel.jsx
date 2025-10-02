import React, {useEffect, useState} from 'react';
import {Panel} from '@ui/components';
import agentService from '@/services/agentService';
import {Activity, BarChart3, Brain, Clock, Database, Lightbulb, Thermometer, Users, Zap} from 'lucide-react';
import './DashboardPanel.css';

const DashboardPanel = () => {
    const [systemStats, setSystemStats] = useState({
        cycleCount: 0,
        beliefs: 0,
        goals: 0,
        questions: 0,
        memoryUsage: 0,
        reasoningSteps: 0,
        lastCycleTime: null,
        cpuUsage: 0,
        temperature: 0
    });

    const [recentEvents, setRecentEvents] = useState([]);
    const [systemStatus, setSystemStatus] = useState('idle');
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Listen for connection status
        const handleStatus = (status) => {
            setIsConnected(status === 'connected');
        };

        // Listen for system stats
        const handleSystemStats = (stats) => {
            setSystemStats(prev => ({...prev, ...stats}));
        };

        // Listen for system events
        const handleSystemCycle = (data) => {
            setSystemStats(prev => ({
                ...prev,
                cycleCount: data.cycleCount || prev.cycleCount + 1
            }));

            setRecentEvents(prev => [
                {
                    id: Date.now(),
                    type: 'cycle',
                    message: `System cycle completed #${data.cycleCount || prev.cycleCount + 1}`,
                    timestamp: new Date().toISOString()
                },
                ...prev.slice(0, 9) // Keep last 10 events
            ]);
        };

        const handleNewBelief = (belief) => {
            setSystemStats(prev => ({
                ...prev,
                beliefs: prev.beliefs + 1
            }));

            setRecentEvents(prev => [
                {
                    id: Date.now(),
                    type: 'belief',
                    message: `New belief added: ${typeof belief === 'string' ? belief : belief.termKey || 'Unknown'}`,
                    timestamp: new Date().toISOString()
                },
                ...prev.slice(0, 9)
            ]);
        };

        const handleNewGoal = (goal) => {
            setSystemStats(prev => ({
                ...prev,
                goals: prev.goals + 1
            }));

            setRecentEvents(prev => [
                {
                    id: Date.now(),
                    type: 'goal',
                    message: `New goal added: ${typeof goal === 'string' ? goal : goal.termKey || 'Unknown'}`,
                    timestamp: new Date().toISOString()
                },
                ...prev.slice(0, 9)
            ]);
        };

        const handleNewQuestion = (question) => {
            setSystemStats(prev => ({
                ...prev,
                questions: prev.questions + 1
            }));

            setRecentEvents(prev => [
                {
                    id: Date.now(),
                    type: 'question',
                    message: `New question added: ${typeof question === 'string' ? question : question.termKey || 'Unknown'}`,
                    timestamp: new Date().toISOString()
                },
                ...prev.slice(0, 9)
            ]);
        };

        // Subscribe to events
        agentService.on('status', handleStatus);
        agentService.on('system_stats', handleSystemStats);
        agentService.on('system_cycle', handleSystemCycle);
        agentService.on('add_belief', handleNewBelief);
        agentService.on('add_goal', handleNewGoal);
        agentService.on('add_question', handleNewQuestion);

        // Request initial stats
        agentService.sendMessage('get_system_stats', {});

        return () => {
            agentService.off('status', handleStatus);
            agentService.off('system_stats', handleSystemStats);
            agentService.off('system_cycle', handleSystemCycle);
            agentService.off('add_belief', handleNewBelief);
            agentService.off('add_goal', handleNewGoal);
            agentService.off('add_question', handleNewQuestion);
        };
    }, []);

    // Format bytes to human readable format
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Format time
    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString();
    };

    // Get status color based on value
    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return 'text-success';
            case 'warning':
                return 'text-warning';
            case 'error':
                return 'text-error';
            default:
                return 'text-info';
        }
    };

    return (
        <Panel title={<><BarChart3 size={18}/> System Dashboard</>}>
            <div className="dashboard-panel">
                {/* System Status Overview */}
                <div className="dashboard-overview">
                    <div className="status-card">
                        <div className="status-icon">
                            <Activity size={24}/>
                        </div>
                        <div className="status-content">
                            <div className="status-value">{systemStats.cycleCount.toLocaleString()}</div>
                            <div className="status-label">Cycles</div>
                        </div>
                    </div>

                    <div className="status-card">
                        <div className="status-icon">
                            <Brain size={24}/>
                        </div>
                        <div className="status-content">
                            <div className="status-value">{systemStats.beliefs.toLocaleString()}</div>
                            <div className="status-label">Beliefs</div>
                        </div>
                    </div>

                    <div className="status-card">
                        <div className="status-icon">
                            <Zap size={24}/>
                        </div>
                        <div className="status-content">
                            <div className="status-value">{systemStats.goals.toLocaleString()}</div>
                            <div className="status-label">Goals</div>
                        </div>
                    </div>

                    <div className="status-card">
                        <div className="status-icon">
                            <Lightbulb size={24}/>
                        </div>
                        <div className="status-content">
                            <div className="status-value">{systemStats.questions.toLocaleString()}</div>
                            <div className="status-label">Questions</div>
                        </div>
                    </div>

                    <div className="status-card">
                        <div className="status-icon">
                            <Database size={24}/>
                        </div>
                        <div className="status-content">
                            <div className="status-value">{formatBytes(systemStats.memoryUsage)}</div>
                            <div className="status-label">Memory</div>
                        </div>
                    </div>

                    <div className="status-card">
                        <div className="status-icon">
                            <Thermometer size={24}/>
                        </div>
                        <div className="status-content">
                            <div className="status-value">{systemStats.temperature.toFixed(2)}</div>
                            <div className="status-label">Temp</div>
                        </div>
                    </div>
                </div>

                {/* Connection Status */}
                <div className="connection-status">
                    <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                        <div className="indicator-dot"></div>
                        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                </div>

                {/* Recent Events */}
                <div className="dashboard-section">
                    <h3><Clock size={18}/> Recent Events</h3>
                    <div className="events-list">
                        {recentEvents.length > 0 ? (
                            recentEvents.map(event => (
                                <div key={event.id} className="event-item">
                                    <div className="event-icon">
                                        {event.type === 'cycle' && <Activity size={16}/>}
                                        {event.type === 'belief' && <Brain size={16}/>}
                                        {event.type === 'goal' && <Zap size={16}/>}
                                        {event.type === 'question' && <Lightbulb size={16}/>}
                                    </div>
                                    <div className="event-content">
                                        <div className="event-message">{event.message}</div>
                                        <div className="event-timestamp">{formatTime(event.timestamp)}</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-events">
                                <Clock size={48}/>
                                <p>No recent events</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* System Info */}
                <div className="dashboard-section">
                    <h3><Users size={18}/> System Information</h3>
                    <div className="system-info-grid">
                        <div className="info-item">
                            <span className="info-label">Reasoning Steps:</span>
                            <span className="info-value">{systemStats.reasoningSteps.toLocaleString()}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">CPU Usage:</span>
                            <span className="info-value">{systemStats.cpuUsage.toFixed(1)}%</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Last Cycle:</span>
                            <span className="info-value">
                                {systemStats.lastCycleTime ?
                                    new Date(systemStats.lastCycleTime).toLocaleTimeString() :
                                    'Never'}
                            </span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Status:</span>
                            <span className={`info-value ${getStatusColor(systemStatus)}`}>
                                {systemStatus}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Panel>
    );
};

export default DashboardPanel;