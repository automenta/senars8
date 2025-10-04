import React, {useEffect, useState} from 'react';
import {Panel} from '@ui/components';
import agentService from '@/services/agentService';
import notificationService from '@/services/notificationService';
import {Code, FileText, RotateCcw, Save, Settings} from 'lucide-react';
import './style.css';

const ConfigurationEditorPanel = () => {
    const [config, setConfig] = useState({});
    const [originalConfig, setOriginalConfig] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [modifiedPaths, setModifiedPaths] = useState(new Set());
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedSections, setExpandedSections] = useState(new Set(['core', 'memory', 'reasoning']));

    // Load configuration from agent
    useEffect(() => {
        const fetchConfig = async () => {
            setIsLoading(true);
            try {
                // Request config from agent with a timeout promise
                const response = await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Timeout fetching configuration'));
                    }, 5000);

                    const handleMessage = (payload) => {
                        clearTimeout(timeout);
                        agentService.off('config_response', handleMessage);
                        resolve(payload);
                    };

                    agentService.on('config_response', handleMessage);
                    agentService.sendMessage('get_config', {});
                });

                if (response && typeof response === 'object') {
                    setConfig(response);
                    setOriginalConfig({...response});
                    setModifiedPaths(new Set());
                    setError('');
                }
            } catch (err) {
                setError(`Failed to load configuration: ${err.message}`);
                notificationService.addError('Config Load Error', err.message);
                console.error('Error fetching config:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchConfig();

        return () => {
            // Cleanup any listeners if needed
        };
    }, []);

    // Update configuration
    const updateConfigValue = (path, value) => {
        const newConfig = {...config};
        const keys = path.split('.');
        let current = newConfig;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (current[key] === undefined || current[key] === null) {
                current[key] = {};
            }
            current = current[key];
        }

        const lastKey = keys[keys.length - 1];
        current[lastKey] = value;

        // Check if value changed from original
        const originalValue = getNestedValue(originalConfig, path);
        const newModifiedPaths = new Set(modifiedPaths);

        if (JSON.stringify(value) !== JSON.stringify(originalValue)) {
            newModifiedPaths.add(path);
        } else {
            newModifiedPaths.delete(path);
        }

        setConfig(newConfig);
        setModifiedPaths(newModifiedPaths);
    };

    // Helper to get nested value from config
    const getNestedValue = (obj, path) => {
        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current === undefined || current === null) {
                return undefined;
            }
            current = current[key];
        }

        return current;
    };

    // Get nested object from config by section path
    const getNestedSection = (obj, path) => {
        if (!path) return obj;

        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current === undefined || current === null) return {};
            current = current[key];
        }

        return current || {};
    };

    // Filter config based on search
    const filterConfig = (obj, searchTerm) => {
        if (!searchTerm) return obj;

        const filtered = {};
        const term = searchTerm.toLowerCase();

        const filterRecursive = (current, path = '') => {
            for (const [key, value] of Object.entries(current)) {
                const currentPath = path ? `${path}.${key}` : key;

                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    const nestedFiltered = filterRecursive(value, searchTerm);
                    if (Object.keys(nestedFiltered).length > 0) {
                        filtered[currentPath.split('.').pop()] = nestedFiltered;
                    }
                } else if (
                    key.toLowerCase().includes(term) ||
                    String(value).toLowerCase().includes(term)
                ) {
                    if (path) {
                        if (!filtered[path.split('.').pop()]) {
                            filtered[path.split('.').pop()] = {};
                        }
                        filtered[path.split('.').pop()][key] = value;
                    } else {
                        filtered[key] = value;
                    }
                }
            }
            return filtered;
        };

        filterRecursive(obj);
        return filtered;
    };

    // Toggle section expansion
    const toggleSection = (section) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(section)) {
            newExpanded.delete(section);
        } else {
            newExpanded.add(section);
        }
        setExpandedSections(newExpanded);
    };

    // Save configuration to agent
    const saveConfiguration = () => {
        setIsLoading(true);
        try {
            // Send to agent
            const success = agentService.sendMessage('update_config', config, {expectResponse: true, timeout: 10000});

            if (success) {
                setOriginalConfig({...config});
                setModifiedPaths(new Set());
                notificationService.addSuccess('Configuration Saved', 'Agent configuration updated successfully');
            } else {
                notificationService.addError('Save Failed', 'Could not save configuration to agent');
            }
        } catch (err) {
            setError(`Failed to save configuration: ${err.message}`);
            notificationService.addError('Save Error', err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Reset to original value
    const resetValue = (path) => {
        const originalValue = getNestedValue(originalConfig, path);
        updateConfigValue(path, originalValue);
    };

    // Reset all changes
    const resetAllChanges = () => {
        setConfig({...originalConfig});
        setModifiedPaths(new Set());
        setError('');
    };

    // Render config section recursively
    const renderConfigSection = (obj, path = '', level = 0) => {
        if (!obj || typeof obj !== 'object') return null;

        const entries = Object.entries(obj).filter(([key]) =>
            typeof key === 'string' && !['constructor', '__proto__'].includes(key)
        );

        if (entries.length === 0) return null;

        return (
            <div className={`config-section level-${level}`}>
                {entries.map(([key, value]) => {
                    const currentPath = path ? `${path}.${key}` : key;
                    const isModified = modifiedPaths.has(currentPath);
                    const isObject = typeof value === 'object' && value !== null && !Array.isArray(value);

                    return (
                        <div key={currentPath} className="config-item">
                            <div className={`config-header ${isModified ? 'modified' : ''}`}>
                                <div className="config-key">
                                    <span className="key-name">{key}</span>
                                    {isModified && <span className="modified-indicator">•</span>}
                                </div>

                                {isObject ? (
                                    <button
                                        className="toggle-section-btn"
                                        onClick={() => toggleSection(currentPath)}
                                    >
                                        {expandedSections.has(currentPath) ? '−' : '+'}
                                    </button>
                                ) : (
                                    <div className="config-actions">
                                        {isModified && (
                                            <button
                                                className="reset-btn"
                                                onClick={() => resetValue(currentPath)}
                                                title="Reset to original value"
                                            >
                                                <RotateCcw size={14}/>
                                            </button>
                                        )}
                                        <span className="value-type">
                                            {typeof value}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {!isObject ? (
                                <div className="config-value">
                                    {typeof value === 'boolean' ? (
                                        <input
                                            type="checkbox"
                                            checked={value}
                                            onChange={(e) => updateConfigValue(currentPath, e.target.checked)}
                                            className="config-checkbox"
                                        />
                                    ) : typeof value === 'number' ? (
                                        <input
                                            type="number"
                                            value={value}
                                            onChange={(e) => updateConfigValue(currentPath, Number(e.target.value))}
                                            className="config-input"
                                        />
                                    ) : (
                                        <input
                                            type={currentPath.includes('password') || currentPath.includes('secret') ? 'password' : 'text'}
                                            value={value}
                                            onChange={(e) => updateConfigValue(currentPath, e.target.value)}
                                            className="config-input"
                                        />
                                    )}
                                </div>
                            ) : (
                                <div
                                    className={`config-nested ${expandedSections.has(currentPath) ? 'expanded' : 'collapsed'}`}>
                                    {expandedSections.has(currentPath) &&
                                        renderConfigSection(value, currentPath, level + 1)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const filteredConfig = filterConfig(config, searchTerm);

    return (
        <Panel title={<><Settings size={18}/> Configuration Editor</>}>
            <div className="configuration-editor-panel">
                {/* Controls */}
                <div className="config-controls">
                    <div className="search-container">
                        <Code size={16}/>
                        <input
                            type="text"
                            placeholder="Search configuration..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="config-search"
                        />
                    </div>

                    <div className="action-buttons">
                        <button
                            onClick={resetAllChanges}
                            disabled={modifiedPaths.size === 0 || isLoading}
                            className="reset-all-btn"
                            title="Reset all changes"
                        >
                            <RotateCcw size={16}/> Reset All
                        </button>

                        <button
                            onClick={saveConfiguration}
                            disabled={modifiedPaths.size === 0 || isLoading}
                            className="save-btn"
                            title="Save configuration"
                        >
                            <Save size={16}/> Save
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="error-message">
                        <span className="error-text">{error}</span>
                    </div>
                )}

                {/* Configuration Content */}
                <div className="config-content">
                    {isLoading ? (
                        <div className="loading">
                            <div className="spinner"></div>
                            <span>Loading configuration...</span>
                        </div>
                    ) : searchTerm ? (
                        <div className="config-section">
                            {Object.keys(filteredConfig).length > 0 ? (
                                renderConfigSection(filteredConfig)
                            ) : (
                                <div className="no-results">
                                    <FileText size={48}/>
                                    <p>No configuration settings match your search</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        renderConfigSection(config)
                    )}
                </div>

                {/* Summary */}
                <div className="config-summary">
                    <div className="summary-item">
                        <span className="summary-label">Modified Settings:</span>
                        <span className="summary-value">{modifiedPaths.size}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Total Settings:</span>
                        <span className="summary-value">{Object.keys(config).length}</span>
                    </div>
                </div>
            </div>
        </Panel>
    );
};

export default ConfigurationEditorPanel;