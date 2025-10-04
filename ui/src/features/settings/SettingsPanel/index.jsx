import React, {useEffect, useState} from 'react';
import {Panel} from '@ui/components';
import notificationService from '@/services/notificationService';
import {useSettings} from '@/context/useSettings';
import {useUIErrorHandler} from '@/services/uiErrorHandler';
import {
    Database,
    Download,
    Globe,
    Monitor,
    Palette,
    RotateCcw,
    Save,
    Settings,
    Upload,
    Volume2,
    Zap
} from 'lucide-react';
import './style.css';

const SettingsPanel = () => {
    const {handleError} = useUIErrorHandler('SettingsPanel');
    const {isSonificationEnabled, toggleSonification} = useSettings();
    const [settings, setSettings] = useState({
        theme: 'dark',
        fontSize: 'medium',
        autoRefresh: true,
        refreshInterval: 5000,
        notifications: true,
        notificationDuration: 5000,
        autoConnect: true,
        maxHistory: 100,
        showTooltips: true,
        animations: true,
        debugMode: false,
        autoSaveLayout: true,
        defaultView: 'dashboard'
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load saved settings
    useEffect(() => {
        try {
            const savedSettings = localStorage.getItem('senars-ui-settings');
            if (savedSettings) {
                setSettings(JSON.parse(savedSettings));
            }
            setIsLoaded(true);
        } catch (error) {
            handleError(error, {operation: 'loadSettings'});
        }
    }, []);

    // Save settings to localStorage
    const saveSettings = () => {
        setIsSaving(true);
        try {
            localStorage.setItem('senars-ui-settings', JSON.stringify(settings));
            notificationService.addSuccess('Settings Saved', 'UI settings have been saved successfully');
        } catch (error) {
            handleError(error, {operation: 'saveSettings'});
        } finally {
            setIsSaving(false);
        }
    };

    // Reset to default settings
    const resetSettings = () => {
        if (window.confirm('Are you sure you want to reset all settings to default?')) {
            const defaultSettings = {
                theme: 'dark',
                fontSize: 'medium',
                autoRefresh: true,
                refreshInterval: 5000,
                notifications: true,
                notificationDuration: 5000,
                autoConnect: true,
                maxHistory: 100,
                showTooltips: true,
                animations: true,
                debugMode: false,
                autoSaveLayout: true,
                defaultView: 'dashboard'
            };
            setSettings(defaultSettings);
            localStorage.setItem('senars-ui-settings', JSON.stringify(defaultSettings));
            notificationService.addInfo('Settings Reset', 'Settings have been reset to defaults');
        }
    };

    // Export settings
    const exportSettings = () => {
        try {
            const dataStr = JSON.stringify(settings, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

            const exportFileDefaultName = 'senars-settings.json';

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();

            notificationService.addSuccess('Settings Exported', 'Settings exported successfully');
        } catch (error) {
            handleError(error, {operation: 'exportSettings'});
        }
    };

    // Import settings
    const importSettings = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedSettings = JSON.parse(e.target.result);
                setSettings(importedSettings);
                localStorage.setItem('senars-ui-settings', JSON.stringify(importedSettings));
                notificationService.addSuccess('Settings Imported', 'Settings imported successfully');
            } catch (error) {
                handleError(error, {operation: 'importSettings'});
                notificationService.addError('Import Failed', 'Invalid settings file format');
            }
        };
        reader.readAsText(file);

        // Reset file input
        event.target.value = '';
    };

    // Handle setting changes
    const handleSettingChange = (key, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', settings.theme);
    }, [settings.theme]);

    // Apply font size to document
    useEffect(() => {
        document.documentElement.style.setProperty('--font-size-multiplier',
            settings.fontSize === 'small' ? '0.9' :
                settings.fontSize === 'large' ? '1.2' : '1.0'
        );
    }, [settings.fontSize]);

    if (!isLoaded) {
        return (
            <Panel title={<><Settings size={18}/> Settings</>}>
                <div className="settings-panel">
                    <div className="loading">
                        <div className="spinner"></div>
                        <span>Loading settings...</span>
                    </div>
                </div>
            </Panel>
        );
    }

    return (
        <Panel title={<><Settings size={18}/> Settings</>}>
            <div className="settings-panel">
                {/* Controls */}
                <div className="settings-controls">
                    <button
                        onClick={saveSettings}
                        disabled={isSaving}
                        className="save-btn"
                        title="Save settings"
                    >
                        <Save size={16}/> {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                    <button
                        onClick={resetSettings}
                        className="reset-btn"
                        title="Reset to defaults"
                    >
                        <RotateCcw size={16}/> Reset
                    </button>
                    <button
                        onClick={exportSettings}
                        className="export-btn"
                        title="Export settings"
                    >
                        <Download size={16}/> Export
                    </button>
                    <label className="import-btn">
                        <Upload size={16}/> Import
                        <input
                            type="file"
                            accept=".json"
                            onChange={importSettings}
                            style={{display: 'none'}}
                        />
                    </label>
                </div>

                {/* Theme Settings */}
                <div className="settings-section">
                    <h3><Palette size={18}/> Theme Settings</h3>
                    <div className="setting-group">
                        <div className="setting-item">
                            <label htmlFor="theme">Theme:</label>
                            <select
                                id="theme"
                                value={settings.theme}
                                onChange={(e) => handleSettingChange('theme', e.target.value)}
                                className="setting-select"
                            >
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                                <option value="system">System</option>
                            </select>
                        </div>
                        <div className="setting-item">
                            <label htmlFor="fontSize">Font Size:</label>
                            <select
                                id="fontSize"
                                value={settings.fontSize}
                                onChange={(e) => handleSettingChange('fontSize', e.target.value)}
                                className="setting-select"
                            >
                                <option value="small">Small</option>
                                <option value="medium">Medium</option>
                                <option value="large">Large</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Audio Settings */}
                <div className="settings-section">
                    <h3><Volume2 size={18}/> Audio Settings</h3>
                    <div className="setting-group">
                        <div className="setting-item">
                            <label htmlFor="sonification">Enable Sonification:</label>
                            <div className="toggle-switch">
                                <input
                                    type="checkbox"
                                    id="sonification"
                                    checked={isSonificationEnabled}
                                    onChange={toggleSonification}
                                    className="toggle-input"
                                />
                                <label htmlFor="sonification" className="toggle-label"></label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Display Settings */}
                <div className="settings-section">
                    <h3><Monitor size={18}/> Display Settings</h3>
                    <div className="setting-group">
                        <div className="setting-item">
                            <label htmlFor="showTooltips">Show Tooltips:</label>
                            <div className="toggle-switch">
                                <input
                                    type="checkbox"
                                    id="showTooltips"
                                    checked={settings.showTooltips}
                                    onChange={(e) => handleSettingChange('showTooltips', e.target.checked)}
                                    className="toggle-input"
                                />
                                <label htmlFor="showTooltips" className="toggle-label"></label>
                            </div>
                        </div>
                        <div className="setting-item">
                            <label htmlFor="animations">Enable Animations:</label>
                            <div className="toggle-switch">
                                <input
                                    type="checkbox"
                                    id="animations"
                                    checked={settings.animations}
                                    onChange={(e) => handleSettingChange('animations', e.target.checked)}
                                    className="toggle-input"
                                />
                                <label htmlFor="animations" className="toggle-label"></label>
                            </div>
                        </div>
                        <div className="setting-item">
                            <label htmlFor="debugMode">Debug Mode:</label>
                            <div className="toggle-switch">
                                <input
                                    type="checkbox"
                                    id="debugMode"
                                    checked={settings.debugMode}
                                    onChange={(e) => handleSettingChange('debugMode', e.target.checked)}
                                    className="toggle-input"
                                />
                                <label htmlFor="debugMode" className="toggle-label"></label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notification Settings */}
                <div className="settings-section">
                    <h3><Globe size={18}/> Notification Settings</h3>
                    <div className="setting-group">
                        <div className="setting-item">
                            <label htmlFor="notifications">Enable Notifications:</label>
                            <div className="toggle-switch">
                                <input
                                    type="checkbox"
                                    id="notifications"
                                    checked={settings.notifications}
                                    onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                                    className="toggle-input"
                                />
                                <label htmlFor="notifications" className="toggle-label"></label>
                            </div>
                        </div>
                        <div className="setting-item">
                            <label htmlFor="notificationDuration">Notification Duration (ms):</label>
                            <input
                                type="number"
                                id="notificationDuration"
                                value={settings.notificationDuration}
                                onChange={(e) => handleSettingChange('notificationDuration', Number(e.target.value))}
                                className="setting-input"
                                min="1000"
                                max="30000"
                            />
                        </div>
                    </div>
                </div>

                {/* Data & Performance Settings */}
                <div className="settings-section">
                    <h3><Database size={18}/> Data & Performance</h3>
                    <div className="setting-group">
                        <div className="setting-item">
                            <label htmlFor="autoRefresh">Auto Refresh Data:</label>
                            <div className="toggle-switch">
                                <input
                                    type="checkbox"
                                    id="autoRefresh"
                                    checked={settings.autoRefresh}
                                    onChange={(e) => handleSettingChange('autoRefresh', e.target.checked)}
                                    className="toggle-input"
                                />
                                <label htmlFor="autoRefresh" className="toggle-label"></label>
                            </div>
                        </div>
                        <div className="setting-item">
                            <label htmlFor="refreshInterval">Refresh Interval (ms):</label>
                            <input
                                type="number"
                                id="refreshInterval"
                                value={settings.refreshInterval}
                                onChange={(e) => handleSettingChange('refreshInterval', Number(e.target.value))}
                                className="setting-input"
                                min="1000"
                                max="60000"
                            />
                        </div>
                        <div className="setting-item">
                            <label htmlFor="maxHistory">Max History Items:</label>
                            <input
                                type="number"
                                id="maxHistory"
                                value={settings.maxHistory}
                                onChange={(e) => handleSettingChange('maxHistory', Number(e.target.value))}
                                className="setting-input"
                                min="10"
                                max="1000"
                            />
                        </div>
                        <div className="setting-item">
                            <label htmlFor="autoSaveLayout">Auto Save Layout:</label>
                            <div className="toggle-switch">
                                <input
                                    type="checkbox"
                                    id="autoSaveLayout"
                                    checked={settings.autoSaveLayout}
                                    onChange={(e) => handleSettingChange('autoSaveLayout', e.target.checked)}
                                    className="toggle-input"
                                />
                                <label htmlFor="autoSaveLayout" className="toggle-label"></label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Settings */}
                <div className="settings-section">
                    <h3><Zap size={18}/> System Settings</h3>
                    <div className="setting-group">
                        <div className="setting-item">
                            <label htmlFor="autoConnect">Auto Connect:</label>
                            <div className="toggle-switch">
                                <input
                                    type="checkbox"
                                    id="autoConnect"
                                    checked={settings.autoConnect}
                                    onChange={(e) => handleSettingChange('autoConnect', e.target.checked)}
                                    className="toggle-input"
                                />
                                <label htmlFor="autoConnect" className="toggle-label"></label>
                            </div>
                        </div>
                        <div className="setting-item">
                            <label htmlFor="defaultView">Default View:</label>
                            <select
                                id="defaultView"
                                value={settings.defaultView}
                                onChange={(e) => handleSettingChange('defaultView', e.target.value)}
                                className="setting-select"
                            >
                                <option value="dashboard">Dashboard</option>
                                <option value="chat">Chat</option>
                                <option value="knowledge-graph">Knowledge Graph</option>
                                <option value="reasoner-trace">Reasoner Trace</option>
                                <option value="status">Status</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Settings Summary */}
                <div className="settings-summary">
                    <div className="summary-item">
                        <span className="summary-label">Theme:</span>
                        <span className="summary-value">{settings.theme}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Font Size:</span>
                        <span className="summary-value">{settings.fontSize}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Auto Refresh:</span>
                        <span className="summary-value">{settings.autoRefresh ? 'On' : 'Off'}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Notifications:</span>
                        <span className="summary-value">{settings.notifications ? 'On' : 'Off'}</span>
                    </div>
                </div>
            </div>
        </Panel>
    );
};

export default SettingsPanel;