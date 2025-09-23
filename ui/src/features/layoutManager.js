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

const LAYOUT_KEY = 'nars-ide-layout';

export const saveLayout = (model) => {
    try {
        const json = model.toJson();
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(json));
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
