import React, {useEffect, useState} from 'react';
import {Panel} from '@ui/components';
import agentService from '@/services/agentService';
import ConceptMap from './ConceptMap';
import ReasoningFlow from './ReasoningFlow';
import {Filter, Network, RotateCcw, Zap} from 'lucide-react';
import './VisualReasoningPanel.css';

function VisualReasoningPanel() {
    const [activeTab, setActiveTab] = useState('concept-map'); // 'concept-map' or 'reasoning-flow'
    const [beliefs, setBeliefs] = useState([]);
    const [goals, setGoals] = useState([]);
    const [inferences, setInferences] = useState([]);
    const [reasoningSteps, setReasoningSteps] = useState([]);
    const [filter, setFilter] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedNode, setSelectedNode] = useState(null);

    // Subscribe to agent events to collect reasoning data
    useEffect(() => {
        const handleBelief = (belief) => {
            setBeliefs(prev => [...prev, belief].slice(-50)); // Keep last 50 beliefs
        };

        const handleGoal = (goal) => {
            setGoals(prev => [...prev, goal].slice(-50)); // Keep last 50 goals
        };

        const handleInference = (inference) => {
            setInferences(prev => [...prev, inference].slice(-50)); // Keep last 50 inferences
        };

        const handleReasoningStep = (step) => {
            setReasoningSteps(prev => [...prev, {
                ...step,
                id: Date.now() + Math.random(), // Ensure unique ID
                timestamp: new Date().toISOString()
            }].slice(-50)); // Keep last 50 steps
        };

        const handleReasoningError = (error) => {
            console.error('Reasoning error:', error);
            setIsLoading(false);
        };

        // Subscribe to events
        agentService.on('add_belief', handleBelief);
        agentService.on('add_goal', handleGoal);
        agentService.on('inference', handleInference);
        agentService.on('reasoning_step', handleReasoningStep);
        agentService.on('answer', handleInference); // Treat answers as inferences
        agentService.on('error', handleReasoningError);

        // Request initial reasoning data
        setIsLoading(true);
        agentService.sendMessage('get_reasoning_data', {});

        // Cleanup on unmount
        return () => {
            agentService.off('add_belief', handleBelief);
            agentService.off('add_goal', handleGoal);
            agentService.off('inference', handleInference);
            agentService.off('reasoning_step', handleReasoningStep);
            agentService.off('answer', handleInference);
            agentService.off('error', handleReasoningError);
        };
    }, []);

    // Handle refresh to get latest reasoning data
    const handleRefresh = () => {
        setIsLoading(true);
        agentService.sendMessage('get_reasoning_data', {});

        // Set timeout to stop loading indicator if response doesn't come
        setTimeout(() => {
            if (isLoading) {
                setIsLoading(false);
            }
        }, 3000);
    };

    // Clear all data
    const handleClearData = () => {
        if (window.confirm('Are you sure you want to clear all reasoning data?')) {
            setBeliefs([]);
            setGoals([]);
            setInferences([]);
            setReasoningSteps([]);
        }
    };

    // Filter data based on the filter text
    const filteredBeliefs = beliefs.filter(b =>
        !filter || JSON.stringify(b).toLowerCase().includes(filter.toLowerCase())
    );

    const filteredGoals = goals.filter(g =>
        !filter || JSON.stringify(g).toLowerCase().includes(filter.toLowerCase())
    );

    const filteredInferences = inferences.filter(i =>
        !filter || JSON.stringify(i).toLowerCase().includes(filter.toLowerCase())
    );

    const filteredReasoningSteps = reasoningSteps.filter(s =>
        !filter || JSON.stringify(s).toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <Panel title={<><Network size={18}/> Visual Reasoning</>}>
            <div className="visual-reasoning-panel">
                <div className="visual-reasoning-header">
                    <div className="reasoning-controls">
                        <div className="filter-container">
                            <Filter size={16}/>
                            <input
                                type="text"
                                placeholder="Filter reasoning data..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="reasoning-filter"
                            />
                        </div>

                        <button
                            onClick={handleRefresh}
                            className="refresh-data-btn"
                            title="Refresh reasoning data"
                            disabled={isLoading}
                        >
                            {isLoading ? <div className="spinner"></div> : <RotateCcw size={16}/>}
                        </button>

                        <button
                            onClick={handleClearData}
                            className="clear-data-btn"
                            title="Clear all reasoning data"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                <div className="reasoning-stats">
                    <div className="stat-item">Beliefs: {beliefs.length}</div>
                    <div className="stat-item">Goals: {goals.length}</div>
                    <div className="stat-item">Inferences: {inferences.length}</div>
                    <div className="stat-item">Steps: {reasoningSteps.length}</div>
                </div>

                <div className="reasoning-tabs">
                    <button
                        className={`reasoning-tab ${activeTab === 'concept-map' ? 'active' : ''}`}
                        onClick={() => setActiveTab('concept-map')}
                    >
                        <Network size={14}/> Concept Map
                    </button>
                    <button
                        className={`reasoning-tab ${activeTab === 'reasoning-flow' ? 'active' : ''}`}
                        onClick={() => setActiveTab('reasoning-flow')}
                    >
                        <Zap size={14}/> Reasoning Flow
                    </button>
                </div>

                <div className="visual-reasoning-content">
                    {isLoading && beliefs.length === 0 && goals.length === 0 && inferences.length === 0 && reasoningSteps.length === 0 ? (
                        <div className="loading-state">
                            <div className="loading-spinner"></div>
                            <p>Loading reasoning data...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'concept-map' ? (
                                <ConceptMap
                                    beliefs={filteredBeliefs}
                                    goals={filteredGoals}
                                    inferences={filteredInferences}
                                    selectedNode={setSelectedNode}
                                />
                            ) : (
                                <ReasoningFlow steps={filteredReasoningSteps}/>
                            )}
                        </>
                    )}
                </div>

                {/* Confidence Legend */}
                <div className="confidence-legend">
                    <div className="legend-item">
                        <div className="legend-color" style={{backgroundColor: '#4CAF50'}}></div>
                        <span>High (0.8-1.0)</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{backgroundColor: '#8BC34A'}}></div>
                        <span>Medium (0.6-0.8)</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{backgroundColor: '#FFC107'}}></div>
                        <span>Low (0.4-0.6)</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{backgroundColor: '#FF9800'}}></div>
                        <span>Very Low (0.2-0.4)</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{backgroundColor: '#F44336'}}></div>
                        <span>Minimal (&lt;0.2)</span>
                    </div>
                </div>
            </div>
        </Panel>
    );
}

export default VisualReasoningPanel;