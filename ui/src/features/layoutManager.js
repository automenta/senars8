const LAYOUT_KEY = 'nars-ide-layout';

export const saveLayout = (model) => {
    try {
        const json = model.toJson();
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(json));
    } catch (error) {
        console.error("Could not save layout:", error);
    }
};

export const loadLayout = (defaultLayout) => {
    try {
        const savedLayout = localStorage.getItem(LAYOUT_KEY);
        if (savedLayout) {
            return JSON.parse(savedLayout);
        }
    } catch (error) {
        console.error("Could not load layout:", error);
    }
    return defaultLayout;
};
