import React, {useCallback} from 'react';
import {Layout} from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import panelRegistry from '@/features/panelRegistry';
import {ErrorBoundary} from '@ui/components';
import Header from '@ui/components/Header';
import Sidebar from '@/components/Sidebar/Sidebar';
import StatusBar from '@ui/components/StatusBar';
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
        <NotificationProvider>
            <SearchProvider>
                <div className="app-container" data-theme={theme}>
                    <Header/>
                    <div className="app-body">
                        <Sidebar model={model} onModelChange={onModelChange} />
                        <main className="app-main" role="main">
                            <Layout
                                model={model}
                                factory={factory}
                                onModelChange={onModelChange}
                                className="app-layout"
                            />
                        </main>
                    </div>
                    <StatusBar/>
                </div>
            </SearchProvider>
        </NotificationProvider>
    );
}

export default App;