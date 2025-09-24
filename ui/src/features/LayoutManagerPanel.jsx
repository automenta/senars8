import React, { useState, useRef } from 'react';
import useLayoutModel from '@/hooks/useLayoutModel';
import { savePresetLayout, loadPresetLayout, getPresetLayouts, deletePresetLayout, exportLayout, importLayout, resetLayout } from '@/features/layoutManager';
import { Save, Upload, Download, RotateCcw, Trash2 } from 'lucide-react';
import { Panel } from '@ui/components';
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
            savePresetLayout(presetName.trim(), model);
            setPresetName('');
        }
    };

    const handleLoadPreset = () => {
        if (selectedPreset) {
            const presetLayout = loadPresetLayout(selectedPreset, model);
            const newModel = model.constructor.fromJson(presetLayout);
            onModelChange(newModel);
        }
    };

    const handleDeletePreset = () => {
        if (selectedPreset) {
            deletePresetLayout(selectedPreset);
            setSelectedPreset('');
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
                const success = importLayout(e.target.result, model);
                if (success) {
                    // Refresh the model after import
                    const newModel = model.constructor.fromJson(loadPresetLayout('imported', model));
                    onModelChange(newModel);
                }
            };
            reader.readAsText(file);
        }
    };

    const handleReset = () => {
        if (window.confirm('Are you sure you want to reset to the default layout?')) {
            const defaultLayout = resetLayout(model);
            const newModel = model.constructor.fromJson(defaultLayout);
            onModelChange(newModel);
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