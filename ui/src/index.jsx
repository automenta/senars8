import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import {ConnectionProvider} from './context/ConnectionProvider.jsx';
import {SettingsProvider} from './context/SettingsProvider.jsx';
import {SharedStateProvider} from "./context/SharedStateProvider.jsx";
import {ThemeProvider} from "./context/ThemeProvider.jsx";
import {SearchProvider} from "./context/SearchContext.jsx";
import {TaskProvider} from "./context/TaskContext.jsx";
import {SessionProvider} from "./context/SessionContext.jsx";

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ThemeProvider>
            <SettingsProvider>
                <ConnectionProvider>
                    <SharedStateProvider>
                        <SearchProvider>
                            <TaskProvider>
                                <SessionProvider>
                                    <App/>
                                </SessionProvider>
                            </TaskProvider>
                        </SearchProvider>
                    </SharedStateProvider>
                </ConnectionProvider>
            </SettingsProvider>
        </ThemeProvider>
    </StrictMode>,
);