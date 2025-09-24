import React, {useState, useEffect} from 'react';
import { Panel } from '@ui/components';
import agentService from '@/services/agentService';
import {Settings as SettingsIcon, Save, RotateCcw, Download, Upload, Monitor, Cpu, HardDrive, Zap} from 'lucide-react';
import './SettingsPanel.css';

// Default configuration values
const DEFAULT_CONFIG = {
    FOCUS_SET_SIZE: 20,
    META_TASK_PRIORITY: 0.9,
    ACTIONABLE_GOAL_PRIORITY_THRESHOLD: 0.1,
    MAX_GOALS_TO_EXECUTE: 3,
    RECENCY_DECAY_FACTOR: 10000,
    SIMILARITY_OFFSET: 0.1,
    SIMILARITY_SCALE: 1.1,
    system: {
        BATCH_SIZE: 10,
        CONFIDENCE_REDUCTION_FACTOR: 0.1
    },
    memory: {
        MAINTENANCE_CYCLE_FREQUENCY: 10,
        MAX_BELIEF_CONCEPTS: 10000,
        MAX_GOAL_CONCEPTS: 1000,
        MAX_QUESTIONS_PER_CONCEPT: 10,
        MAX_OPERATIONAL_CONCEPTS: 100,
        MAX_EXECUTABLES_PER_CONCEPT: 10,
        MAX_TERMLINKS_PER_CONCEPT: 32,
        MAX_TASKLINKS_PER_CONCEPT: 64,
        MAX_PRECONDITIONS: 8
    },
    reasoning: {
        BELIEF_REASONING_PRIORITY: 0.9,
        QUESTION_REASONING_PRIORITY: 0.95,
        GOAL_REASONING_PRIORITY: 0.99,
        OPERATIONAL_INCENTIVE_PRIORITY: 0.9,
        TASK_SOLVING_PRIORITY_FACTOR: 0.1
    },
    temporal: {
        INTERVAL_ADAPT_SPEED: 0.5,
        MAX_SEQUENCE_EVENTS: 8,
        MAX_CONDITION_TERMS: 8
    },
    concept: {
        MAX_BELIEF_EVENTS: 8,
        MAX_GOAL_EVENTS: 8,
        MAX_QUESTIONS: 8,
        MAX_OPERATIONS: 8,
        MAX_PRECONDITIONS: 8
    }
};

function SettingsPanel() {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [originalConfig, setOriginalConfig] = useState(DEFAULT_CONFIG);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [activeTab, setActiveTab] = useState('agent');

    // Load initial configuration
    useEffect(() => {
        const loadConfig = async () => {
            try {
                // In a real implementation, this would fetch current config from the agent
                // For now we use the default config
                setConfig(DEFAULT_CONFIG);
                setOriginalConfig({...DEFAULT_CONFIG});
            } catch (error) {
                console.error('Failed to load config:', error);
            }
        };

        loadConfig();
    }, []);

    // Check for changes
    useEffect(() => {
        const isChanged = JSON.stringify(config) !== JSON.stringify(originalConfig);
        setHasUnsavedChanges(isChanged);
    }, [config, originalConfig]);

    const handleConfigChange = (category, key, value) => {
        setConfig(prev => {
            const newConfig = {...prev};
            if (category === 'root') {
                newConfig[key] = value;
            } else {
                newConfig[category] = {
                    ...newConfig[category],
                    [key]: value
                };
            }
            return newConfig;
        });
    };

    const handleSave = () => {
        // Send config to agent
        agentService.sendMessage('update_config', config);
        // Update original config to match current
        setOriginalConfig({...config});
        console.log('Configuration saved:', config);
    };

    const handleReset = () => {
        setConfig({...originalConfig});
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(config, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'senars-config.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedConfig = JSON.parse(e.target.result);
                setConfig(importedConfig);
            } catch (error) {
                console.error('Failed to parse imported config:', error);
                alert('Invalid configuration file');
            }
        };
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    };

    const renderNumberInput = (category, key, value, label) => (
        <div className="setting-row">
            <label htmlFor={`${category}-${key}`}>{label}</label>
            <input
                id={`${category}-${key}`}
                type="number"
                value={value}
                onChange={(e) => handleConfigChange(category, key, parseFloat(e.target.value))}
                step="any"
                className="number-input"
            />
        </div>
    );

    const renderCategory = (category, categoryConfig) => (
        <div className="settings-category">
            <h4>{category.charAt(0).toUpperCase() + category.slice(1)} Settings</h4>
            {Object.entries(categoryConfig).map(([key, value]) => (
                <div key={key} className="setting-row">
                    <label htmlFor={`${category}-${key}`}>{key}</label>
                    {typeof value === 'number' ? (
                        <input
                            id={`${category}-${key}`}
                            type="number"
                            value={value}
                            onChange={(e) => handleConfigChange(category, key, parseFloat(e.target.value))}
                            step="any"
                            className="number-input"
                        />
                    ) : typeof value === 'string' ? (
                        <input
                            id={`${category}-${key}`}
                            type="text"
                            value={value}
                            onChange={(e) => handleConfigChange(category, key, e.target.value)}
                            className="text-input"
                        />
                    ) : (
                        <input
                            id={`${category}-${key}`}
                            type="checkbox"
                            checked={value}
                            onChange={(e) => handleConfigChange(category, key, e.target.checked)}
                            className="checkbox-input"
                        />
                    )}
                </div>
            ))}
        </div>
    );

    return (
        <Panel title={<><SettingsIcon size={18}/> Settings</>}>
            <div className="settings-panel">
                {/* Tabs for different configuration sections */}
                <div className="settings-tabs">
                    <button 
                        className={`tab-button ${activeTab === 'agent' ? 'active' : ''}`}
                        onClick={() => setActiveTab('agent')}
                    >
                        <Cpu size={16} /> Agent
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'memory' ? 'active' : ''}`}
                        onClick={() => setActiveTab('memory')}
                    >
                        <HardDrive size={16} /> Memory
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'reasoning' ? 'active' : ''}`}
                        onClick={() => setActiveTab('reasoning')}
                    >
                        <Zap size={16} /> Reasoning
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'temporal' ? 'active' : ''}`}
                        onClick={() => setActiveTab('temporal')}
                    >
                        <Monitor size={16} /> Temporal
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'concept' ? 'active' : ''}`}
                        onClick={() => setActiveTab('concept')}
                    >
                        <Zap size={16} /> Concept
                    </button>
                </div>

                <div className="settings-content">
                    {activeTab === 'agent' && (
                        <div className="settings-category">
                            <h4>Agent Settings</h4>
                            {renderNumberInput('root', 'FOCUS_SET_SIZE', config.FOCUS_SET_SIZE, 'Focus Set Size')}
                            {renderNumberInput('root', 'META_TASK_PRIORITY', config.META_TASK_PRIORITY, 'Meta Task Priority')}
                            {renderNumberInput('root', 'ACTIONABLE_GOAL_PRIORITY_THRESHOLD', config.ACTIONABLE_GOAL_PRIORITY_THRESHOLD, 'Actionable Goal Priority Threshold')}
                            {renderNumberInput('root', 'MAX_GOALS_TO_EXECUTE', config.MAX_GOALS_TO_EXECUTE, 'Max Goals to Execute')}
                            {renderNumberInput('root', 'RECENCY_DECAY_FACTOR', config.RECENCY_DECAY_FACTOR, 'Recency Decay Factor')}
                            {renderNumberInput('root', 'SIMILARITY_OFFSET', config.SIMILARITY_OFFSET, 'Similarity Offset')}
                            {renderNumberInput('root', 'SIMILARITY_SCALE', config.SIMILARITY_SCALE, 'Similarity Scale')}
                            
                            <div className="settings-subcategory">
                                <h5>System Settings</h5>
                                {renderNumberInput('system', 'BATCH_SIZE', config.system.BATCH_SIZE, 'Batch Size')}
                                {renderNumberInput('system', 'CONFIDENCE_REDUCTION_FACTOR', config.system.CONFIDENCE_REDUCTION_FACTOR, 'Confidence Reduction Factor')}
                            </div>
                        </div>
                    )}

                    {activeTab === 'memory' && (
                        <div className="settings-category">
                            <h4>Memory Settings</h4>
                            {renderNumberInput('memory', 'MAINTENANCE_CYCLE_FREQUENCY', config.memory.MAINTENANCE_CYCLE_FREQUENCY, 'Maintenance Cycle Frequency')}
                            {renderNumberInput('memory', 'MAX_BELIEF_CONCEPTS', config.memory.MAX_BELIEF_CONCEPTS, 'Max Belief Concepts')}
                            {renderNumberInput('memory', 'MAX_GOAL_CONCEPTS', config.memory.MAX_GOAL_CONCEPTS, 'Max Goal Concepts')}
                            {renderNumberInput('memory', 'MAX_QUESTIONS_PER_CONCEPT', config.memory.MAX_QUESTIONS_PER_CONCEPT, 'Max Questions Per Concept')}
                            {renderNumberInput('memory', 'MAX_OPERATIONAL_CONCEPTS', config.memory.MAX_OPERATIONAL_CONCEPTS, 'Max Operational Concepts')}
                            {renderNumberInput('memory', 'MAX_EXECUTABLES_PER_CONCEPT', config.memory.MAX_EXECUTABLES_PER_CONCEPT, 'Max Executables Per Concept')}
                            {renderNumberInput('memory', 'MAX_TERMLINKS_PER_CONCEPT', config.memory.MAX_TERMLINKS_PER_CONCEPT, 'Max Termlinks Per Concept')}
                            {renderNumberInput('memory', 'MAX_TASKLINKS_PER_CONCEPT', config.memory.MAX_TASKLINKS_PER_CONCEPT, 'Max Tasklinks Per Concept')}
                            {renderNumberInput('memory', 'MAX_PRECONDITIONS', config.memory.MAX_PRECONDITIONS, 'Max Preconditions')}
                        </div>
                    )}

                    {activeTab === 'reasoning' && (
                        <div className="settings-category">
                            <h4>Reasoning Settings</h4>
                            {renderNumberInput('reasoning', 'BELIEF_REASONING_PRIORITY', config.reasoning.BELIEF_REASONING_PRIORITY, 'Belief Reasoning Priority')}
                            {renderNumberInput('reasoning', 'QUESTION_REASONING_PRIORITY', config.reasoning.QUESTION_REASONING_PRIORITY, 'Question Reasoning Priority')}
                            {renderNumberInput('reasoning', 'GOAL_REASONING_PRIORITY', config.reasoning.GOAL_REASONING_PRIORITY, 'Goal Reasoning Priority')}
                            {renderNumberInput('reasoning', 'OPERATIONAL_INCENTIVE_PRIORITY', config.reasoning.OPERATIONAL_INCENTIVE_PRIORITY, 'Operational Incentive Priority')}
                            {renderNumberInput('reasoning', 'TASK_SOLVING_PRIORITY_FACTOR', config.reasoning.TASK_SOLVING_PRIORITY_FACTOR, 'Task Solving Priority Factor')}
                        </div>
                    )}

                    {activeTab === 'temporal' && (
                        <div className="settings-category">
                            <h4>Temporal Settings</h4>
                            {renderNumberInput('temporal', 'INTERVAL_ADAPT_SPEED', config.temporal.INTERVAL_ADAPT_SPEED, 'Interval Adapt Speed')}
                            {renderNumberInput('temporal', 'MAX_SEQUENCE_EVENTS', config.temporal.MAX_SEQUENCE_EVENTS, 'Max Sequence Events')}
                            {renderNumberInput('temporal', 'MAX_CONDITION_TERMS', config.temporal.MAX_CONDITION_TERMS, 'Max Condition Terms')}
                        </div>
                    )}

                    {activeTab === 'concept' && (
                        <div className="settings-category">
                            <h4>Concept Settings</h4>
                            {renderNumberInput('concept', 'MAX_BELIEF_EVENTS', config.concept.MAX_BELIEF_EVENTS, 'Max Belief Events')}
                            {renderNumberInput('concept', 'MAX_GOAL_EVENTS', config.concept.MAX_GOAL_EVENTS, 'Max Goal Events')}
                            {renderNumberInput('concept', 'MAX_QUESTIONS', config.concept.MAX_QUESTIONS, 'Max Questions')}
                            {renderNumberInput('concept', 'MAX_OPERATIONS', config.concept.MAX_OPERATIONS, 'Max Operations')}
                            {renderNumberInput('concept', 'MAX_PRECONDITIONS', config.concept.MAX_PRECONDITIONS, 'Max Preconditions')}
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                <div className="settings-actions">
                    <button 
                        onClick={handleSave} 
                        disabled={!hasUnsavedChanges}
                        className="action-button save-button"
                        title="Save configuration"
                    >
                        <Save size={16} /> Save
                    </button>
                    <button 
                        onClick={handleReset}
                        disabled={!hasUnsavedChanges}
                        className="action-button reset-button"
                        title="Reset to previous values"
                    >
                        <RotateCcw size={16} /> Reset
                    </button>
                    <button 
                        onClick={handleExport}
                        className="action-button export-button"
                        title="Export configuration"
                    >
                        <Download size={16} /> Export
                    </button>
                    <label className="action-button import-button" title="Import configuration">
                        <Upload size={16} /> Import
                        <input 
                            type="file" 
                            accept=".json" 
                            onChange={handleImport}
                            style={{display: 'none'}}
                        />
                    </label>
                </div>

                {/* Status indicator */}
                {hasUnsavedChanges && (
                    <div className="settings-status">
                        <span className="unsaved-indicator">Unsaved changes</span>
                    </div>
                )}
            </div>
        </Panel>
    );
}

export default SettingsPanel;