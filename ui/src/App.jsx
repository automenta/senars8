import React, {useCallback} from 'react';
import {Layout} from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import panelRegistry from '@/features/panelRegistry';
import {ErrorBoundary, Header, StatusBar} from '@ui/components';
import useAppInit from '@/hooks/useAppInit';
import useLayoutModel from '@/hooks/useLayoutModel';
import {useTheme} from '@/context/ThemeProvider';
import {SearchProvider} from '@/context/SearchContext';
import {NotificationProvider} from '@/context/NotificationContext';
import './App.css';

function App() {
    const {model, onModelChange} = useLayoutModel();
    const {theme} = useTheme();
    useAppInit();

    const factory = useCallback((node) => {
        const componentName = node.getComponent();
        const PanelComponent = panelRegistry[componentName];
        return (
            <ErrorBoundary>
                {PanelComponent ? <PanelComponent/> : <div>Panel not found: {componentName}</div>}
            </ErrorBoundary>
        );
    }, []);

    return (
        <SearchProvider>
            <div className="app-container" data-theme={theme}>
                <Header/>
                <main className="app-main" role="main">
                    <Layout
                        model={model}
                        factory={factory}
                        onModelChange={onModelChange}
                        className="app-layout"
                    />
                </main>
                <StatusBar/>
            </div>
        </SearchProvider>
    );
}

export default App;