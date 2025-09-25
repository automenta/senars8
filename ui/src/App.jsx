import React from 'react';
import {Layout} from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import panelRegistry from '@/features/panelRegistry';
import {ErrorBoundary} from '@ui/components';
import Header from '@ui/components/Header';
import StatusBar from '@ui/components/StatusBar';
import useAppInit from '@/hooks/useAppInit';
import useLayoutModel from '@/hooks/useLayoutModel';
import {useTheme} from '@/context/ThemeProvider';
import {SearchProvider} from '@/context/SearchContext';
import {NotificationProvider} from '@/context/NotificationContext';
import './App.css';

const factory = (node) => {
    const componentName = node.getComponent();
    const PanelComponent = panelRegistry[componentName];
    return (
        <ErrorBoundary>
            {PanelComponent ? <PanelComponent/> : <div>Panel not found: {componentName}</div>}
        </ErrorBoundary>
    );
};

function App() {
    const {model, onModelChange} = useLayoutModel();
    const {theme} = useTheme();
    useAppInit();

    return (
        <NotificationProvider>
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
        </NotificationProvider>
    );
}

export default App;