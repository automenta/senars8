import log from '@core/utils/logger.js';

const LAYOUT_KEY = 'senars-ide-layout';
const PRESET_LAYOUTS_KEY = 'senars-ide-preset-layouts';

// Predefined layout presets
const PRESET_LAYOUTS = {
    'default': {
        global: {},
        borders: [],
        layout: {
            type: 'row',
            weight: 100,
            children: [
                {
                    type: 'tabset',
                    weight: 20,
                    selected: 0,
                    children: [
                        {
                            type: 'tab',
                            name: 'Files',
                            component: 'file-explorer',
                        },
                    ],
                },
                {
                    type: 'row',
                    weight: 80,
                    children: [
                        {
                            type: 'tabset',
                            weight: 70,
                            selected: 0,
                            children: [
                                {
                                    type: 'tab',
                                    name: 'Editor',
                                    component: 'code-editor',
                                },
                            ],
                        },
                        {
                            type: 'tabset',
                            weight: 30,
                            selected: 0,
                            children: [
                                {
                                    type: 'tab',
                                    name: 'Terminal',
                                    component: 'terminal',
                                },
                                {
                                    type: 'tab',
                                    name: 'Input',
                                    component: 'input',
                                },
                                {
                                    type: 'tab',
                                    name: 'Log',
                                    component: 'log',
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    },
    'development': {
        global: {},
        borders: [],
        layout: {
            type: 'row',
            weight: 100,
            children: [
                {
                    type: 'tabset',
                    weight: 15,
                    selected: 0,
                    children: [
                        {
                            type: 'tab',
                            name: 'Files',
                            component: 'file-explorer',
                        },
                    ],
                },
                {
                    type: 'row',
                    weight: 85,
                    children: [
                        {
                            type: 'tabset',
                            weight: 60,
                            selected: 0,
                            children: [
                                {
                                    type: 'tab',
                                    name: 'Editor',
                                    component: 'code-editor',
                                },
                            ],
                        },
                        {
                            type: 'tabset',
                            weight: 40,
                            selected: 0,
                            children: [
                                {
                                    type: 'tab',
                                    name: 'Terminal',
                                    component: 'terminal',
                                },
                                {
                                    type: 'tab',
                                    name: 'Visual Reasoning',
                                    component: 'visual-reasoning',
                                },
                                {
                                    type: 'tab',
                                    name: 'Reasoner Trace',
                                    component: 'reasoner-trace',
                                },
                                {
                                    type: 'tab',
                                    name: 'Memory',
                                    component: 'memory-view',
                                },
                                {
                                    type: 'tab',
                                    name: 'Settings',
                                    component: 'settings',
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    },
    'analysis': {
        global: {},
        borders: [],
        layout: {
            type: 'row',
            weight: 100,
            children: [
                {
                    type: 'tabset',
                    weight: 30,
                    selected: 0,
                    children: [
                        {
                            type: 'tab',
                            name: 'Knowledge Graph',
                            component: 'knowledge-graph',
                        },
                        {
                            type: 'tab',
                            name: 'Memory',
                            component: 'memory-view',
                        },
                    ],
                },
                {
                    type: 'row',
                    weight: 70,
                    children: [
                        {
                            type: 'tabset',
                            weight: 40,
                            selected: 0,
                            children: [
                                {
                                    type: 'tab',
                                    name: 'Input',
                                    component: 'input',
                                },
                                {
                                    type: 'tab',
                                    name: 'Log',
                                    component: 'log',
                                },
                            ],
                        },
                        {
                            type: 'tabset',
                            weight: 60,
                            selected: 0,
                            children: [
                                {
                                    type: 'tab',
                                    name: 'Visual Reasoning',
                                    component: 'visual-reasoning',
                                },
                                {
                                    type: 'tab',
                                    name: 'Reasoner Trace',
                                    component: 'reasoner-trace',
                                },
                                {
                                    type: 'tab',
                                    name: 'Internal State',
                                    component: 'internal-state',
                                },
                                {
                                    type: 'tab',
                                    name: 'Settings',
                                    component: 'settings',
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    },
    'user-friendly': {
        global: {},
        borders: [],
        layout: {
            type: 'row',
            weight: 100,
            children: [
                {
                    type: 'tabset',
                    weight: 70,
                    selected: 0,
                    children: [
                        {
                            type: 'tab',
                            name: 'Chat',
                            component: 'input',  // Enhanced input panel
                        },
                        {
                            type: 'tab',
                            name: 'Memory',
                            component: 'memory-view',
                        },
                    ],
                },
                {
                    type: 'tabset',
                    weight: 30,
                    selected: 0,
                    children: [
                        {
                            type: 'tab',
                            name: 'Visual Reasoning',
                            component: 'visual-reasoning',
                        },
                        {
                            type: 'tab',
                            name: 'Conversation',
                            component: 'conversation-history',
                        },
                        {
                            type: 'tab',
                            name: 'Reasoning Trace',
                            component: 'reasoner-trace',
                        },
                        {
                            type: 'tab',
                            name: 'Settings',
                            component: 'settings',
                        },
                    ],
                },
            ],
        },
    }
};

/**
 * Save the current layout to localStorage
 * @param {Object} model - The layout model to save
 * @param {string} key - Optional custom key for saving
 */
export const saveLayout = (model, key = LAYOUT_KEY) => {
    try {
        if (!model || typeof model.toJson !== 'function') {
            throw new Error('Invalid layout model provided');
        }

        const json = model.toJson();
        // Validate that the JSON is actually a valid layout object
        if (!json || typeof json !== 'object' || !json.layout) {
            throw new Error('Invalid layout data structure');
        }

        localStorage.setItem(key, JSON.stringify(json));
        log.info("Layout saved successfully");
    } catch (error) {
        log.error("Could not save layout:", error);
        // Attempt to save a backup of the layout data to session storage
        try {
            const backupKey = `${key}_backup`;
            localStorage.setItem(backupKey, JSON.stringify({error: error.message, timestamp: Date.now()}));
        } catch (backupError) {
            log.error("Could not save layout backup:", backupError);
        }
    }
};

/**
 * Load layout from localStorage or return default if not found
 * @param {Object} defaultLayout - The default layout to return if none is saved
 * @param {string} key - Optional custom key for loading
 * @returns {Object} The loaded or default layout
 */
export const loadLayout = (defaultLayout, key = LAYOUT_KEY) => {
    try {
        // First try to load from main storage
        let savedLayout = localStorage.getItem(key);

        if (!savedLayout) {
            // Check for backup if main storage is empty
            const backupKey = `${key}_backup`;
            const backupLayout = localStorage.getItem(backupKey);
            if (backupLayout) {
                savedLayout = backupLayout;
                log.warn("Using backup layout");
            }
        }

        if (!savedLayout) {
            return defaultLayout;
        }

        const parsedLayout = JSON.parse(savedLayout);

        // Validate the layout structure
        if (!parsedLayout || typeof parsedLayout !== 'object' || !parsedLayout.layout) {
            log.error("Invalid layout structure found in storage");
            return defaultLayout;
        }

        return parsedLayout;
    } catch (error) {
        log.error("Could not load layout:", error);

        // Try to load from backup if available
        try {
            const backupKey = `${key}_backup`;
            const backupLayout = localStorage.getItem(backupKey);
            if (backupLayout) {
                const parsedBackup = JSON.parse(backupLayout);
                log.info("Loaded layout from backup");
                return parsedBackup;
            }
        } catch (backupError) {
            log.error("Could not load layout backup:", backupError);
        }

        return defaultLayout;
    }
};

/**
 * Save a named layout preset
 * @param {string} name - The name of the preset
 * @param {Object} model - The layout model to save as preset
 */
export const savePresetLayout = (name, model) => {
    try {
        const json = model.toJson();
        const presets = getPresetLayouts();
        presets[name] = json;
        localStorage.setItem(PRESET_LAYOUTS_KEY, JSON.stringify(presets));
        log.info(`Preset layout "${name}" saved successfully`);
    } catch (error) {
        log.error(`Could not save preset layout "${name}":`, error);
    }
};

/**
 * Load a named layout preset
 * @param {string} name - The name of the preset to load
 * @param {Object} defaultLayout - The default layout to return if preset is not found
 * @returns {Object} The loaded preset layout or default layout
 */
export const loadPresetLayout = (name, defaultLayout) => {
    try {
        const presets = getPresetLayouts();
        const preset = presets[name];
        return preset || defaultLayout;
    } catch (error) {
        log.error(`Could not load preset layout "${name}":`, error);
        return defaultLayout;
    }
};

/**
 * Get all saved preset layouts
 * @returns {Object} Object containing all preset layouts
 */
export const getPresetLayouts = () => {
    try {
        const presets = localStorage.getItem(PRESET_LAYOUTS_KEY);
        return presets ? JSON.parse(presets) : {...PRESET_LAYOUTS};
    } catch (error) {
        log.error("Could not load preset layouts:", error);
        return {...PRESET_LAYOUTS};
    }
};

/**
 * Delete a named preset layout
 * @param {string} name - The name of the preset to delete
 */
export const deletePresetLayout = (name) => {
    try {
        const presets = getPresetLayouts();
        delete presets[name];
        localStorage.setItem(PRESET_LAYOUTS_KEY, JSON.stringify(presets));
        log.info(`Preset layout "${name}" deleted successfully`);
    } catch (error) {
        log.error(`Could not delete preset layout "${name}":`, error);
    }
};

/**
 * Export the current layout as a JSON file for download
 * @param {Object} model - The layout model to export
 */
export const exportLayout = (model) => {
    try {
        const json = model.toJson();
        const dataStr = JSON.stringify(json, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = 'senars-layout.json';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        log.info("Layout exported successfully");
    } catch (error) {
        log.error("Could not export layout:", error);
    }
};

/**
 * Import a layout from a JSON string
 * @param {string} jsonString - The JSON string representing the layout
 * @param {Object} model - The layout model to populate
 * @returns {boolean} True if import was successful, false otherwise
 */
export const importLayout = (jsonString, model) => {
    try {
        const layout = JSON.parse(jsonString);
        model.fromJson(layout);
        saveLayout(model);
        log.info("Layout imported successfully");
        return true;
    } catch (error) {
        log.error("Could not import layout:", error);
        return false;
    }
};

/**
 * Reset layout to default
 * @returns {Object} The default layout
 */
export const resetLayout = () => {
    try {
        localStorage.removeItem(LAYOUT_KEY);
        log.info("Layout reset to default");
        // Return the default user-friendly layout
        return PRESET_LAYOUTS['user-friendly'] || PRESET_LAYOUTS['default'];
    } catch (error) {
        log.error("Could not reset layout:", error);
        // Return the default layout if reset fails
        return PRESET_LAYOUTS['user-friendly'] || PRESET_LAYOUTS['default'];
    }
};
