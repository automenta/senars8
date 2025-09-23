import React, {useRef} from 'react';
import {Layout} from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import panelRegistry from '@/features/panelRegistry';
import StatusBar from '@/components/ui/StatusBar';
import useAppInit from '@/hooks/useAppInit';
import useLayoutModel from '@/hooks/useLayoutModel';

const factory = (node) => {
    const componentName = node.getComponent();
    const PanelComponent = panelRegistry[componentName];
    if (PanelComponent) {
        return <PanelComponent/>;
    }
    return null;
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
                <Layout
                    ref={layoutRef}
                    model={model}
                    factory={factory}
                    onModelChange={onModelChange}
                />
            </main>
            <StatusBar/>
        </div>
    );
}

export default App;