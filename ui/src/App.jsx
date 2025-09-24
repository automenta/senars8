import React, {useRef} from 'react';
import {Layout} from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import panelRegistry from '@/features/panelRegistry';
import {ErrorBoundary, Tooltip, GlobalSearch} from '@ui/components';
import StatusBar from '@ui/components/StatusBar';
import useAppInit from '@/hooks/useAppInit';
import useLayoutModel from '@/hooks/useLayoutModel';
import {useTheme} from '@/context/ThemeProvider';
import {SearchProvider} from '@/context/SearchContext';
import './App.css';

function App() {
    const modelRef = useRef(null);
    const { model, onModelChange } = useLayoutModel();
    const { theme } = useTheme();
    useAppInit();

    const factory = (node) => {
        const componentName = node.getComponent();
        const PanelComponent = panelRegistry[componentName];
        if (PanelComponent) {
            return <ErrorBoundary><PanelComponent/></ErrorBoundary>;
        }
        return <ErrorBoundary><div>Panel not found: {componentName}</div></ErrorBoundary>;
    };

    return (
        <div className="app-container" data-theme={theme}>
            <header className="app-header" role="banner">
                <h1>SeNARS IDE</h1>
                <div className="header-controls">
                    <GlobalSearch />
                </div>
            </header>
            <main className="app-main" role="main">
                <Layout
                    model={model}
                    factory={factory}
                    onModelChange={onModelChange}
                    className="app-layout"
                />
            </main>
            <StatusBar />
        </div>
    );
}

export default App;