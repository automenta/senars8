import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {ConnectionProvider} from './context/ConnectionProvider.jsx'
import {SettingsProvider} from './context/SettingsProvider.jsx'
import {SharedStateProvider} from "./context/SharedStateProvider.jsx";

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <SettingsProvider>
            <ConnectionProvider>
                <SharedStateProvider>
                    <App/>
                </SharedStateProvider>
            </ConnectionProvider>
        </SettingsProvider>
    </StrictMode>,
)
