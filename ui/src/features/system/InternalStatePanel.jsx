import React, {useEffect, useState} from 'react';
import {Panel} from '@ui/components';
import agentService from '@/services/agentService';
import {Activity, Brain, Clock, Thermometer, Zap} from 'lucide-react';
import {uiFormatting} from '@common/index.js';
import './InternalStatePanel.css';

function InternalStatePanel() {
    const [agentState, setAgentState] = useState({
        status: 'disconnected',
        uptime: 0,
        cycles: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        beliefs: 0,
        goals: 0,
        tasks: 0,
        operations: 0,
        temperature: 0,
        lastUpdate: null
    });

    useEffect(() => {
        const handleStateUpdate = (state) => {
            setAgentState(prev => ({
                ...prev,
                ...state,
                lastUpdate: new Date()
            }));
        };

        agentService.on('agent_state_update', handleStateUpdate);

        // Request initial state
        agentService.sendMessage('get_agent_state', {});

        // Set up periodic updates
        const interval = setInterval(() => {
            agentService.sendMessage('get_agent_state', {});
        }, 5000); // Update every 5 seconds

        return () => {
            agentService.off('agent_state_update', handleStateUpdate);
            clearInterval(interval);
        };
    }, []);

    

    const getStatusColor = (status) => {
        switch (status) {
            case 'running':
                return '#4caf50';
            case 'paused':
                return '#ff9800';
            case 'stopped':
                return '#f44336';
            case 'disconnected':
                return '#9e9e9e';
            default:
                return '#9e9e9e';
        }
    };

    return (
        <Panel title={<><Thermometer size={18}/> Internal State</>}>
            <div className="internal-state-panel">
                {/* Status Header */}
                <div className="status-header">
                    <div className="status-indicator" style={{backgroundColor: getStatusColor(agentState.status)}}>
                        {agentState.status}
                    </div>
                    <div className="last-update">
                        Last update: {agentState.lastUpdate ? agentState.lastUpdate.toLocaleTimeString() : 'Never'}
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="metrics-grid">
                    <div className="metric-card">
                        <div className="metric-header">
                            <Clock size={16}/>
                            <span>Uptime</span>
                        </div>
                        <div className="metric-value">{uiFormatting.formatUptime(agentState.uptime)}</div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-header">
                            <Activity size={16}/>
                            <span>Cycles</span>
                        </div>
                        <div className="metric-value">{agentState.cycles.toLocaleString()}</div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-header">
                            <Brain size={16}/>
                            <span>Beliefs</span>
                        </div>
                        <div className="metric-value">{agentState.beliefs.toLocaleString()}</div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-header">
                            <Zap size={16}/>
                            <span>Goals</span>
                        </div>
                        <div className="metric-value">{agentState.goals.toLocaleString()}</div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-header">
                            <Thermometer size={16}/>
                            <span>Temperature</span>
                        </div>
                        <div className="metric-value">{agentState.temperature.toFixed(2)}</div>
                        <div className="metric-bar">
                            <div
                                className="metric-bar-fill"
                                style={{width: `${Math.min(100, agentState.temperature * 100)}%`}}
                            ></div>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-header">
                            <Activity size={16}/>
                            <span>Memory</span>
                        </div>
                        <div className="metric-value">{uiFormatting.formatBytes(agentState.memoryUsage)}</div>
                        <div className="metric-bar">
                            <div
                                className="metric-bar-fill"
                                style={{width: `${Math.min(100, agentState.memoryUsage / (1024 * 1024 * 100) * 100)}%`}}
                            ></div>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-header">
                            <Zap size={16}/>
                            <span>CPU</span>
                        </div>
                        <div className="metric-value">{agentState.cpuUsage.toFixed(1)}%</div>
                        <div className="metric-bar">
                            <div
                                className="metric-bar-fill"
                                style={{width: `${agentState.cpuUsage}%`}}
                            ></div>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-header">
                            <Activity size={16}/>
                            <span>Tasks</span>
                        </div>
                        <div className="metric-value">{agentState.tasks.toLocaleString()}</div>
                    </div>
                </div>

                {/* Additional Info */}
                <div className="additional-info">
                    <h4>System Information</h4>
                    <div className="info-grid">
                        <div className="info-item">
                            <span className="info-label">Operations:</span>
                            <span className="info-value">{agentState.operations.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Panel>
    );
}

export default InternalStatePanel;
