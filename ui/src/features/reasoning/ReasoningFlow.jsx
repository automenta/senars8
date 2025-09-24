import React, { useState, useEffect, useCallback } from 'react';
import { Panel } from '@ui/components';
import { Zap, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import './VisualReasoningPanel.css';

function ReasoningFlow({ steps }) {
    const [flowSteps, setFlowSteps] = useState([]);

    useEffect(() => {
        // Convert reasoning steps to flow format
        if (steps && Array.isArray(steps)) {
            const convertedSteps = steps.map((step, index) => ({
                id: step.id || `step-${index}`,
                type: step.type || 'unknown',
                content: step.content || step.statement || JSON.stringify(step),
                timestamp: step.timestamp || new Date().toISOString(),
                confidence: step.confidence || step.priority || 0.5,
                source: step.source || 'system',
                derivedFrom: step.derivedFrom || [],
                conclusion: step.conclusion || step.output || null
            }));
            setFlowSteps(convertedSteps);
        }
    }, [steps]);

    // Determine icon based on step type
    const getStepIcon = useCallback((type) => {
        if (!type) return <AlertTriangle size={14} />;
        const lowerType = type.toLowerCase();
        if (lowerType.includes('infer') || lowerType.includes('derive')) return <Zap size={14} />;
        if (lowerType.includes('input') || lowerType.includes('query')) return <ArrowRight size={14} style={{transform: 'rotate(180deg)'}} />;
        if (lowerType.includes('output') || lowerType.includes('answer')) return <ArrowRight size={14} />;
        if (lowerType.includes('time') || lowerType.includes('cycle')) return <Clock size={14} />;
        return <AlertTriangle size={14} />;
    }, []);

    // Get confidence color
    const getConfidenceColor = useCallback((confidence) => {
        const conf = typeof confidence === 'number' ? confidence : 0.5;
        if (conf >= 0.8) return '#4CAF50';    // Green
        if (conf >= 0.6) return '#8BC34A';   // Light green
        if (conf >= 0.4) return '#FFC107';   // Amber
        if (conf >= 0.2) return '#FF9800';   // Orange
        return '#F44336';                    // Red
    }, []);

    // Format timestamp
    const formatTimestamp = useCallback((timestamp) => {
        return new Date(timestamp).toLocaleTimeString();
    }, []);

    return (
        <div className="reasoning-flow-container">
            <div className="reasoning-flow">
                {flowSteps.length > 0 ? (
                    <>
                        {flowSteps.slice(0, 50).map((step, index) => (  // Limit to first 50 steps for performance
                            <div key={step.id} className="flow-step">
                                <div className="step-header" style={{borderLeftColor: getConfidenceColor(step.confidence)}}>
                                    <div className="step-icon" title={step.type}>
                                        {getStepIcon(step.type)}
                                    </div>
                                    <div className="step-info">
                                        <div className="step-type">{step.type || 'Step'}</div>
                                        <div className="step-timestamp">{formatTimestamp(step.timestamp)}</div>
                                    </div>
                                    <div className="step-confidence" title={`Confidence: ${step.confidence}`}>
                                        <div
                                            className="confidence-indicator"
                                            style={{backgroundColor: getConfidenceColor(step.confidence)}}
                                        />
                                        <span className="confidence-value">{(step.confidence * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                                <div className="step-content">
                                    <div className="step-content-text">{step.content}</div>
                                    {step.conclusion && (
                                        <div className="step-conclusion">
                                            <strong>→ Conclusion:</strong> {step.conclusion}
                                        </div>
                                    )}
                                </div>
                                {index < Math.min(50, flowSteps.length) - 1 && ( // Fix connector logic
                                    <div className="step-connector">
                                        <ArrowRight size={16} />
                                    </div>
                                )}
                            </div>
                        ))}
                        {flowSteps.length > 50 && (
                            <div className="flow-step info">
                                Showing 50 of {flowSteps.length} steps. Filter to see specific steps.
                            </div>
                        )}
                    </>
                ) : (
                    <div className="reasoning-flow-empty">
                        {steps === undefined || steps === null ? (
                            <div className="loading-state">
                                <div className="loading-spinner"></div>
                                <p>Loading reasoning flow data...</p>
                            </div>
                        ) : (
                            <div>No reasoning steps to display yet.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ReasoningFlow;