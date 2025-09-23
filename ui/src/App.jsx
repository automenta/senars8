import React, { useEffect, useRef, useState } from 'react';
import { Layout, Model } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import agentService from '@/services/agentService';
import sonificationService from '@/services/sonificationService';
import panelRegistry from '@/features/panelRegistry';
import { saveLayout, loadLayout } from '@/features/layoutManager';
import defaultLayout from '@/features/defaultLayout';

const initialModel = Model.fromJson(loadLayout(defaultLayout));

function App() {
    const [model, setModel] = useState(initialModel);
    const layoutRef = useRef();

    const onModelChange = (newModel) => {
        saveLayout(newModel);
        setModel(newModel);
    }

    useEffect(() => {
        agentService.connect();
        const handleFirstInteraction = () => {
            sonificationService.initialize();
            window.removeEventListener('click', handleFirstInteraction);
        };
        window.addEventListener('click', handleFirstInteraction);
        return () => {
            agentService.disconnect();
            window.removeEventListener('click', handleFirstInteraction);
        };
    }, []);

    const factory = (node) => {
        const componentName = node.getComponent();
        const PanelComponent = panelRegistry[componentName];
        if (PanelComponent) {
            return <PanelComponent />;
        }
        return null;
    };

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>SeNARS IDE</h1>
            </header>
            <main className="app-main">
                <Layout
                    ref={layoutRef}
                    model={model}
                    factory={factory}
                    onModelChange={onModelChange}
                />
            </main>
        </div>
    );
}

export default App;