import React, { useState, useRef } from 'react';
import useLayoutModel from '@/hooks/useLayoutModel';
import { savePresetLayout, loadPresetLayout, getPresetLayouts, deletePresetLayout, exportLayout, importLayout, resetLayout } from '@/features/layoutManager';
import { Save, Upload, Download, RotateCcw, Trash2 } from 'lucide-react';
import { Panel } from '@ui/components';
import notificationService from '@/services/notificationService';
import log from '@/utils/logger';
import './LayoutManagerPanel.css';

const LayoutManagerPanel = () => {
    const { model, onModelChange } = useLayoutModel();
    const [presetName, setPresetName] = useState('');
    const [selectedPreset, setSelectedPreset] = useState('');
    const fileInputRef = useRef(null);
    
    const presets = getPresetLayouts();
    const presetNames = Object.keys(presets);

    const handleSavePreset = () => {
        if (presetName.trim()) {
            try {
                savePresetLayout(presetName.trim(), model);
                setPresetName('');
                notificationService.addSuccess('Layout Saved', `Layout preset "${presetName.trim()}" saved successfully`);
            } catch (error) {
                log.error('Error saving layout preset:', error);
                notificationService.addError('Save Error', `Failed to save layout preset: ${error.message}`);
            }
        } else {
            notificationService.addWarning('Invalid Name', 'Please enter a name for the layout preset');
        }
    };

    const handleLoadPreset = () => {
        if (selectedPreset) {
            try {
                const presetLayout = loadPresetLayout(selectedPreset, model);
                if (!presetLayout) {
                    throw new Error(`Preset "${selectedPreset}" could not be loaded`);
                }
                const newModel = model.constructor.fromJson(presetLayout);
                onModelChange(newModel);
                notificationService.addInfo('Layout Loaded', `Layout preset "${selectedPreset}" loaded successfully`);
            } catch (error) {
                log.error('Error loading layout preset:', error);
                notificationService.addError('Load Error', `Failed to load layout preset: ${error.message}`);
            }
        } else {
            notificationService.addWarning('No Selection', 'Please select a layout preset to load');
        }
    };

    const handleDeletePreset = () => {
        if (selectedPreset) {
            if (window.confirm(`Are you sure you want to delete the preset "${selectedPreset}"?`)) {
                try {
                    deletePresetLayout(selectedPreset);
                    setSelectedPreset('');
                    notificationService.addInfo('Preset Deleted', `Layout preset "${selectedPreset}" has been deleted`);
                } catch (error) {
                    log.error('Error deleting layout preset:', error);
                    notificationService.addError('Delete Error', `Failed to delete layout preset: ${error.message}`);
                }
            }
        } else {
            notificationService.addWarning('No Selection', 'Please select a layout preset to delete');
        }
    };

    const handleExport = () => {
        exportLayout(model);
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const layoutJson = JSON.parse(e.target.result);
                    if (!layoutJson || typeof layoutJson !== 'object') {
                        throw new Error('Invalid layout file format');
                    }
                    // Create a new model from the imported layout
                    const newModel = model.constructor.fromJson(layoutJson);
                    onModelChange(newModel);
                    notificationService.addSuccess('Layout Imported', 'Layout has been imported successfully');
                } catch (error) {
                    log.error('Error importing layout:', error);
                    notificationService.addError('Import Error', `Invalid layout file: ${error.message}`);
                }
            };
            reader.onerror = () => {
                notificationService.addError('Import Error', 'Failed to read layout file');
            };
            reader.readAsText(file);
        }
    };

    const handleReset = () => {
        if (window.confirm('Are you sure you want to reset to the default layout?')) {
            try {
                const defaultLayout = resetLayout();  // resetLayout doesn't take a model parameter
                if (!defaultLayout) {
                    throw new Error('Could not load default layout');
                }
                const newModel = model.constructor.fromJson(defaultLayout);
                onModelChange(newModel);
                notificationService.addInfo('Layout Reset', 'Layout has been reset to default');
            } catch (error) {
                log.error('Error resetting layout:', error);
                notificationService.addError('Reset Error', `Failed to reset layout: ${error.message}`);
            }
        }
    };

    return (
        <Panel header={<h3>Layout Manager</h3>} className="layout-manager-panel">
            <div className="layout-section">
                <h4>Save Current Layout</h4>
                <div className="input-group">
                    <input
                        type="text"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        placeholder="Preset name"
                        className="preset-name-input"
                    />
                    <button onClick={handleSavePreset} className="save-button">
                        <Save size={16} /> Save
                    </button>
                </div>
            </div>
            
            <div className="layout-section">
                <h4>Load Layout Preset</h4>
                <div className="input-group">
                    <select
                        value={selectedPreset}
                        onChange={(e) => setSelectedPreset(e.target.value)}
                        className="preset-select"
                    >
                        <option value="">Select a preset</option>
                        {presetNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                    <button onClick={handleLoadPreset} disabled={!selectedPreset} className="load-button">
                        Load
                    </button>
                    <button onClick={handleDeletePreset} disabled={!selectedPreset} className="delete-button">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
            
            <div className="layout-section">
                <h4>Import/Export</h4>
                <div className="button-group">
                    <button onClick={handleExport} className="export-button">
                        <Download size={16} /> Export Layout
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="import-button">
                        <Upload size={16} /> Import Layout
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImport}
                        accept=".json"
                        style={{ display: 'none' }}
                    />
                </div>
            </div>
            
            <div className="layout-section">
                <h4>Reset Layout</h4>
                <button onClick={handleReset} className="reset-button">
                    <RotateCcw size={16} /> Reset to Default
                </button>
            </div>
        </Panel>
    );
};

export default LayoutManagerPanel;