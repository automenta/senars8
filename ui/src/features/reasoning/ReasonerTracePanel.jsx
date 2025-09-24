import React, {useCallback, useEffect, useState, useMemo} from 'react';
import { Panel } from '@ui/components';
import agentService from '@/services/agentService';
import {Footprints, Filter, Search} from 'lucide-react';
import { MESSAGE_TYPES } from '@/constants/ui';
import './ReasonerTracePanel.css';

function ReasonerTracePanel() {
    const [trace, setTrace] = useState([]);
    const [filter, setFilter] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'inference', 'decision', 'revision'
    const [expandedSteps, setExpandedSteps] = useState(new Set());

    const handleStep = useCallback((step) => {
        setTrace(prev => [...prev, {
            ...step,
            id: Date.now() + Math.random(), // Unique ID for each step
            timestamp: new Date().toISOString()
        }]);
    }, []);

        useEffect(() => {
        const handleStep = (step) => {
            setTrace(prev => [...prev, {
                ...step,
                id: Date.now() + Math.random(), // Unique ID for each step
                timestamp: new Date().toISOString()
            }]);
        };

        agentService.on(MESSAGE_TYPES.REASONING_TRACE, handleStep);

        return () => {
            agentService.off(MESSAGE_TYPES.REASONING_TRACE, handleStep);
        };
    }, []);

    // Filter and categorize trace steps
    const filteredTrace = useMemo(() => {
        return trace.filter(step => {
            // Apply text filter
            if (filter && !JSON.stringify(step).toLowerCase().includes(filter.toLowerCase())) {
                return false;
            }
            
            // Apply category filter
            if (activeTab !== 'all') {
                const stepType = step.type || 'unknown';
                return stepType.toLowerCase().includes(activeTab.toLowerCase());
            }
            
            return true;
        });
    }, [trace, filter, activeTab]);

    const handleClearTrace = () => {
        if (window.confirm('Are you sure you want to clear the reasoning trace?')) {
            setTrace([]);
        }
    };

    const toggleStepExpansion = (stepId) => {
        setExpandedSteps(prev => {
            const newSet = new Set(prev);
            if (newSet.has(stepId)) {
                newSet.delete(stepId);
            } else {
                newSet.add(stepId);
            }
            return newSet;
        });
    };

    // Categorize trace steps for tab counts
    const traceCategories = useMemo(() => {
        const categories = {
            all: trace.length,
            inference: 0,
            decision: 0,
            revision: 0
        };
        
        trace.forEach(step => {
            const type = (step.type || 'unknown').toLowerCase();
            if (type.includes('infer')) categories.inference++;
            if (type.includes('decide') || type.includes('decision')) categories.decision++;
            if (type.includes('revision') || type.includes('revise')) categories.revision++;
        });
        
        return categories;
    }, [trace]);

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString();
    };

    const getStepIcon = (type) => {
        if (!type) return '🔹';
        const lowerType = type.toLowerCase();
        if (lowerType.includes('infer')) return '🧠';
        if (lowerType.includes('decide') || lowerType.includes('decision')) return '⚖️';
        if (lowerType.includes('revision') || lowerType.includes('revise')) return '🔄';
        return '🔹';
    };

    return (
        <Panel title={<><Footprints size={18}/> Reasoner Trace</>}>
            <div className="reasoner-trace-panel">
                {/* Controls */}
                <div className="trace-controls">
                    <div className="filter-container">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Filter trace..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="trace-filter"
                        />
                    </div>
                    
                    <button 
                        onClick={handleClearTrace}
                        className="clear-trace-btn"
                    >
                        Clear Trace
                    </button>
                </div>

                {/* Tabs */}
                <div className="trace-tabs">
                    <button 
                        className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        All ({traceCategories.all})
                    </button>
                    <button 
                        className={`tab ${activeTab === 'inference' ? 'active' : ''}`}
                        onClick={() => setActiveTab('inference')}
                    >
                        Inference ({traceCategories.inference})
                    </button>
                    <button 
                        className={`tab ${activeTab === 'decision' ? 'active' : ''}`}
                        onClick={() => setActiveTab('decision')}
                    >
                        Decision ({traceCategories.decision})
                    </button>
                    <button 
                        className={`tab ${activeTab === 'revision' ? 'active' : ''}`}
                        onClick={() => setActiveTab('revision')}
                    >
                        Revision ({traceCategories.revision})
                    </button>
                </div>

                {/* Trace List */}
                <div className="trace-content">
                    {filteredTrace.length > 0 ? (
                        <ul className="reasoner-trace-list">
                            {filteredTrace.map((step) => (
                                <li key={step.id} className="trace-step">
                                    <div 
                                        className="step-header"
                                        onClick={() => toggleStepExpansion(step.id)}
                                    >
                                        <span className="step-icon">{getStepIcon(step.type)}</span>
                                        <span className="step-type">{step.type || 'Unknown'}</span>
                                        <span className="step-timestamp">{formatTimestamp(step.timestamp)}</span>
                                        <span className="expand-indicator">
                                            {expandedSteps.has(step.id) ? '−' : '+'}
                                        </span>
                                    </div>
                                    
                                    {expandedSteps.has(step.id) && (
                                        <div className="step-details">
                                            <pre className="step-data">
                                                {JSON.stringify(step, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="reasoner-trace-empty">
                            {filter || activeTab !== 'all' 
                                ? 'No matching reasoning steps found.' 
                                : 'No reasoning steps yet.'}
                        </div>
                    )}
                </div>
                
                {/* Summary */}
                <div className="trace-summary">
                    Showing {filteredTrace.length} of {trace.length} steps
                </div>
            </div>
        </Panel>
    );
}

export default ReasonerTracePanel;