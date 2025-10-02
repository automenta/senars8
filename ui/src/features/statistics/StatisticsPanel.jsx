import React, {useEffect, useState} from 'react';
import {Panel} from '@ui/components';
import agentService from '@/services/agentService';
import {Activity, BarChart, Brain, Clock, TrendingUp} from 'lucide-react';
import './StatisticsPanel.css';

function StatisticsPanel() {
    const [stats, setStats] = useState({
        cycleCount: 0,
        beliefCount: 0,
        taskCount: 0,
        reasoningSteps: 0,
        lastCycleTime: null,
        averageCycleTime: 0,
        memoryUsage: 0
    });

    const [_cycleTimes, _setCycleTimes] = useState([]);
    const [beliefHistory, setBeliefHistory] = useState([]);

    useEffect(() => {
        const handleSystemCycle = (data) => {
            setStats(prev => {
                const newCycleCount = data.cycleCount || (prev.cycleCount + 1);
                const newStats = {
                    ...prev,
                    cycleCount: newCycleCount,
                    lastCycleTime: new Date().toISOString()
                };

                return newStats;
            });
        };

        const handleNewBelief = (belief) => {
            setStats(prev => ({
                ...prev,
                beliefCount: prev.beliefCount + 1
            }));

            setBeliefHistory(prev => [...prev.slice(-19), belief]); // Keep last 20 beliefs
        };

        const handlePlanCreated = (_planData) => {
            setStats(prev => ({
                ...prev,
                taskCount: prev.taskCount + 1
            }));
        };

        const handleReasoningStep = (_step) => {
            setStats(prev => ({
                ...prev,
                reasoningSteps: prev.reasoningSteps + 1
            }));
        };

        agentService.on('system_cycle', handleSystemCycle);
        agentService.on('add_belief', handleNewBelief);
        agentService.on('planCreated', handlePlanCreated);
        agentService.on('reasoning_step', handleReasoningStep);

        return () => {
            agentService.off('system_cycle', handleSystemCycle);
            agentService.off('add_belief', handleNewBelief);
            agentService.off('planCreated', handlePlanCreated);
            agentService.off('reasoning_step', handleReasoningStep);
        };
    }, []);

    // Calculate some derived statistics
    const beliefsPerCycle = stats.cycleCount > 0 ? (stats.beliefCount / stats.cycleCount).toFixed(2) : 0;
    const tasksPerCycle = stats.cycleCount > 0 ? (stats.taskCount / stats.cycleCount).toFixed(2) : 0;

    return (
        <Panel title={<><BarChart size={18}/> Statistics</>}>
            <div className="statistics-panel">
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">
                            <Activity size={24}/>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.cycleCount}</div>
                            <div className="stat-label">Cycles</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">
                            <Brain size={24}/>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.beliefCount}</div>
                            <div className="stat-label">Beliefs</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">
                            <TrendingUp size={24}/>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.taskCount}</div>
                            <div className="stat-label">Tasks</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">
                            <Clock size={24}/>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.reasoningSteps}</div>
                            <div className="stat-label">Reasoning Steps</div>
                        </div>
                    </div>
                </div>

                <div className="stats-details">
                    <div className="stat-row">
                        <span>Beliefs per Cycle:</span>
                        <span>{beliefsPerCycle}</span>
                    </div>
                    <div className="stat-row">
                        <span>Tasks per Cycle:</span>
                        <span>{tasksPerCycle}</span>
                    </div>
                    <div className="stat-row">
                        <span>Average Cycle Time:</span>
                        <span>{stats.averageCycleTime.toFixed(2)}ms</span>
                    </div>
                    <div className="stat-row">
                        <span>Last Cycle:</span>
                        <span>{stats.lastCycleTime ? new Date(stats.lastCycleTime).toLocaleTimeString() : 'Never'}</span>
                    </div>
                </div>

                <div className="stats-history">
                    <h3>Recent Beliefs</h3>
                    <ul className="belief-list">
                        {beliefHistory.length === 0 ? (
                            <li className="empty">No beliefs yet</li>
                        ) : (
                            beliefHistory.map((belief, index) => (
                                <li key={index} className="belief-item">
                                    {belief}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>
        </Panel>
    );
}

export default StatisticsPanel;