// Simple logging utility for the UI
const log = {
    info: (message, ...args) => console.log(`[INFO] ${message}`, ...args),
    warn: (message, ...args) => console.warn(`[WARN] ${message}`, ...args),
    error: (message, ...args) => console.error(`[ERROR] ${message}`, ...args),
    debug: (message, ...args) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }
};

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
                    ],
                },
            ],
        },
    }
};

export const saveLayout = (model) => {
    try {
        const json = model.toJson();
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(json));
        log.info("Layout saved successfully");
    } catch (error) {
        log.error("Could not save layout:", error);
    }
};

export const loadLayout = (defaultLayout) => {
    try {
        const savedLayout = localStorage.getItem(LAYOUT_KEY);
        return savedLayout ? JSON.parse(savedLayout) : defaultLayout;
    } catch (error) {
        log.error("Could not load layout:", error);
        return defaultLayout;
    }
};

// Save a named layout preset
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

// Load a named layout preset
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

// Get all preset layouts
export const getPresetLayouts = () => {
    try {
        const presets = localStorage.getItem(PRESET_LAYOUTS_KEY);
        return presets ? JSON.parse(presets) : { ...PRESET_LAYOUTS };
    } catch (error) {
        log.error("Could not load preset layouts:", error);
        return { ...PRESET_LAYOUTS };
    }
};

// Delete a preset layout
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

// Export layout as JSON
export const exportLayout = (model) => {
    try {
        const json = model.toJson();
        const dataStr = JSON.stringify(json, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
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

// Import layout from JSON
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

// Reset to default layout
export const resetLayout = (defaultLayout) => {
    try {
        localStorage.removeItem(LAYOUT_KEY);
        log.info("Layout reset to default");
        return defaultLayout;
    } catch (error) {
        log.error("Could not reset layout:", error);
        return defaultLayout;
    }
};
