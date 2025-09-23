import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ConnectionProvider } from './context/ConnectionContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <SettingsProvider>
            <ConnectionProvider>
                <App />
            </ConnectionProvider>
        </SettingsProvider>
    </StrictMode>,
)
