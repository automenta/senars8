import React, {useState, useEffect} from 'react';
import Panel from '@/components/core/Panel';
import agentService from '@/services/agentService';
import {Settings as SettingsIcon, Save, RotateCcw, Download, Upload} from 'lucide-react';
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
        CONSOLIDATION_PRIORITY_THRESHOLD: 0.8,
        CONSOLIDATION_CONFIDENCE_THRESHOLD: 0.9
    },
    reasoner: {
        strategy: 'BagSampling'
    },
    planner: {
        strategy: 'HTN',
        maxDepth: 10
    },
    temporal: {
        REGULARITY_BOOST: 0.7,
        STRUCTURAL_SIMILARITY_WEIGHT: 0.3,
        TEMPORAL_CONFIDENCE: 0.9
    }
};

function SettingsPanel() {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [originalConfig, setOriginalConfig] = useState(DEFAULT_CONFIG);

    // In a real implementation, we would fetch the current config from the agent
    // For now, we'll just use the default config
    useEffect(() => {
        // This would be where we fetch the current configuration from the agent
        // agentService.on('config', (currentConfig) => {
        //     setConfig(currentConfig);
        //     setOriginalConfig(currentConfig);
        // });
    }, []);

    const handleChange = (path, value) => {
        const newConfig = {...config};
        const keys = path.split('.');
        let current = newConfig;
        
        // Navigate to the correct nested object
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        // Set the value
        current[keys[keys.length - 1]] = value;
        setConfig(newConfig);
    };

    const handleSave = () => {
        // Send the updated configuration to the agent
        agentService.sendConfigUpdate(config);
        setOriginalConfig({...config});
    };

    const handleReset = () => {
        // Reset to the original configuration
        setConfig({...originalConfig});
    };

    const handleExport = () => {
        // Create a data object with both config and beliefs
        const data = {
            config: config,
            timestamp: new Date().toISOString()
        };
        
        // Convert to JSON and create a download
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nars-config-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.config) {
                    setConfig(data.config);
                    setOriginalConfig(data.config);
                }
            } catch (error) {
                console.error('Failed to import configuration:', error);
                alert('Failed to import configuration. Please check the file format.');
            }
        };
        reader.readAsText(file);
        // Reset the file input
        event.target.value = '';
    };

    const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

    return (
        <Panel title={<><SettingsIcon size={18}/> Settings</>}>
            <div className="settings-panel">
                <div className="settings-section">
                    <h3>General</h3>
                    <div className="setting-row">
                        <label htmlFor="focusSetSize">Focus Set Size:</label>
                        <input
                            id="focusSetSize"
                            type="number"
                            value={config.FOCUS_SET_SIZE}
                            onChange={(e) => handleChange('FOCUS_SET_SIZE', parseInt(e.target.value))}
                            min="1"
                        />
                    </div>
                    <div className="setting-row">
                        <label htmlFor="metaTaskPriority">Meta Task Priority:</label>
                        <input
                            id="metaTaskPriority"
                            type="number"
                            value={config.META_TASK_PRIORITY}
                            onChange={(e) => handleChange('META_TASK_PRIORITY', parseFloat(e.target.value))}
                            min="0"
                            max="1"
                            step="0.1"
                        />
                    </div>
                </div>

                <div className="settings-section">
                    <h3>System</h3>
                    <div className="setting-row">
                        <label htmlFor="batchSize">Batch Size:</label>
                        <input
                            id="batchSize"
                            type="number"
                            value={config.system.BATCH_SIZE}
                            onChange={(e) => handleChange('system.BATCH_SIZE', parseInt(e.target.value))}
                            min="1"
                        />
                    </div>
                    <div className="setting-row">
                        <label htmlFor="confidenceReduction">Confidence Reduction Factor:</label>
                        <input
                            id="confidenceReduction"
                            type="number"
                            value={config.system.CONFIDENCE_REDUCTION_FACTOR}
                            onChange={(e) => handleChange('system.CONFIDENCE_REDUCTION_FACTOR', parseFloat(e.target.value))}
                            min="0"
                            max="1"
                            step="0.01"
                        />
                    </div>
                </div>

                <div className="settings-section">
                    <h3>Memory</h3>
                    <div className="setting-row">
                        <label htmlFor="maintenanceCycle">Maintenance Cycle Frequency:</label>
                        <input
                            id="maintenanceCycle"
                            type="number"
                            value={config.memory.MAINTENANCE_CYCLE_FREQUENCY}
                            onChange={(e) => handleChange('memory.MAINTENANCE_CYCLE_FREQUENCY', parseInt(e.target.value))}
                            min="1"
                        />
                    </div>
                    <div className="setting-row">
                        <label htmlFor="consolidationPriority">Consolidation Priority Threshold:</label>
                        <input
                            id="consolidationPriority"
                            type="number"
                            value={config.memory.CONSOLIDATION_PRIORITY_THRESHOLD}
                            onChange={(e) => handleChange('memory.CONSOLIDATION_PRIORITY_THRESHOLD', parseFloat(e.target.value))}
                            min="0"
                            max="1"
                            step="0.1"
                        />
                    </div>
                </div>

                <div className="settings-section">
                    <h3>Reasoner</h3>
                    <div className="setting-row">
                        <label htmlFor="reasonerStrategy">Strategy:</label>
                        <select
                            id="reasonerStrategy"
                            value={config.reasoner.strategy}
                            onChange={(e) => handleChange('reasoner.strategy', e.target.value)}
                        >
                            <option value="BagSampling">Bag Sampling</option>
                            <option value="Probabilistic">Probabilistic</option>
                            <option value="Deterministic">Deterministic</option>
                        </select>
                    </div>
                </div>

                <div className="settings-section">
                    <h3>Planner</h3>
                    <div className="setting-row">
                        <label htmlFor="plannerStrategy">Strategy:</label>
                        <select
                            id="plannerStrategy"
                            value={config.planner.strategy}
                            onChange={(e) => handleChange('planner.strategy', e.target.value)}
                        >
                            <option value="HTN">HTN</option>
                            <option value="STRIPS">STRIPS</option>
                            <option value="GraphPlan">GraphPlan</option>
                        </select>
                    </div>
                    <div className="setting-row">
                        <label htmlFor="maxDepth">Max Depth:</label>
                        <input
                            id="maxDepth"
                            type="number"
                            value={config.planner.maxDepth}
                            onChange={(e) => handleChange('planner.maxDepth', parseInt(e.target.value))}
                            min="1"
                        />
                    </div>
                </div>

                <div className="settings-section">
                    <h3>Export/Import</h3>
                    <div className="setting-row">
                        <button onClick={handleExport} title="Export configuration">
                            <Download size={16}/> Export Config
                        </button>
                        <label className="file-input-label">
                            <Upload size={16}/> Import Config
                            <input 
                                type="file" 
                                accept=".json"
                                onChange={handleImport}
                                style={{display: 'none'}}
                            />
                        </label>
                    </div>
                </div>

                <div className="settings-actions">
                    <button 
                        onClick={handleSave} 
                        disabled={!hasChanges}
                        title="Save settings"
                    >
                        <Save size={16}/> Save
                    </button>
                    <button 
                        onClick={handleReset} 
                        disabled={!hasChanges}
                        title="Reset changes"
                    >
                        <RotateCcw size={16}/> Reset
                    </button>
                </div>
            </div>
        </Panel>
    );
}

export default SettingsPanel;