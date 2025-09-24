import React, {useRef} from 'react';
import {Layout} from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import panelRegistry from '@/features/panelRegistry';
import {ErrorBoundary} from '@ui/components';
import StatusBar from '@ui/components/StatusBar';
import useAppInit from '@/hooks/useAppInit';
import useLayoutModel from '@/hooks/useLayoutModel';
import './App.css';

const factory = (node) => {
    const componentName = node.getComponent();
    const PanelComponent = panelRegistry[componentName];
    if (PanelComponent) {
        return <ErrorBoundary><PanelComponent/></ErrorBoundary>;
    }
    return <ErrorBoundary><div>Panel not found: {componentName}</div></ErrorBoundary>;
};

function App() {
    useAppInit();
    const {model, onModelChange} = useLayoutModel();
    const layoutRef = useRef();

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>SeNARS IDE</h1>
            </header>
            <main className="app-main">
                <ErrorBoundary>
                    <Layout
                        ref={layoutRef}
                        model={model}
                        factory={factory}
                        onModelChange={onModelChange}
                    />
                </ErrorBoundary>
            </main>
            <StatusBar/>
        </div>
    );
}

export default App;