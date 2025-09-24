import React, { useState, useEffect, useCallback } from 'react';
import { Panel } from '@ui/components';
import agentService from '@/services/agentService';
import ConceptMap from './ConceptMap';
import ReasoningFlow from './ReasoningFlow';
import { Network, Zap, Brain, Filter, RotateCcw } from 'lucide-react';
import './VisualReasoningPanel.css';

function VisualReasoningPanel() {
    const [activeTab, setActiveTab] = useState('concept-map'); // 'concept-map' or 'reasoning-flow'
    const [beliefs, setBeliefs] = useState([]);
    const [goals, setGoals] = useState([]);
    const [inferences, setInferences] = useState([]);
    const [reasoningSteps, setReasoningSteps] = useState([]);
    const [filter, setFilter] = useState('');
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

        // Subscribe to events
        agentService.on('add_belief', handleBelief);
        agentService.on('add_goal', handleGoal);
        agentService.on('inference', handleInference);
        agentService.on('reasoning_step', handleReasoningStep);
        agentService.on('answer', handleInference); // Treat answers as inferences

        // Cleanup on unmount
        return () => {
            agentService.off('add_belief', handleBelief);
            agentService.off('add_goal', handleGoal);
            agentService.off('inference', handleInference);
            agentService.off('reasoning_step', handleReasoningStep);
            agentService.off('answer', handleInference);
        };
    }, []);

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
                            <Filter size={16} />
                            <input
                                type="text"
                                placeholder="Filter reasoning data..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="reasoning-filter"
                            />
                        </div>
                        
                        <button 
                            onClick={handleClearData}
                            className="clear-data-btn"
                            title="Clear all reasoning data"
                        >
                            <RotateCcw size={16} />
                        </button>
                    </div>
                </div>

                <div className="reasoning-tabs">
                    <button 
                        className={`reasoning-tab ${activeTab === 'concept-map' ? 'active' : ''}`}
                        onClick={() => setActiveTab('concept-map')}
                    >
                        <Network size={14} /> Concept Map
                    </button>
                    <button 
                        className={`reasoning-tab ${activeTab === 'reasoning-flow' ? 'active' : ''}`}
                        onClick={() => setActiveTab('reasoning-flow')}
                    >
                        <Zap size={14} /> Reasoning Flow
                    </button>
                </div>

                <div className="visual-reasoning-content">
                    {activeTab === 'concept-map' ? (
                        <ConceptMap 
                            beliefs={filteredBeliefs} 
                            goals={filteredGoals} 
                            inferences={filteredInferences} 
                            selectedNode={setSelectedNode}
                        />
                    ) : (
                        <ReasoningFlow steps={filteredReasoningSteps} />
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