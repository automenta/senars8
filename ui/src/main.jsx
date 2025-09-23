import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {ConnectionProvider} from './context/ConnectionProvider.jsx'
import {SettingsProvider} from './context/SettingsProvider.jsx'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <SettingsProvider>
            <ConnectionProvider>
                <App/>
            </ConnectionProvider>
        </SettingsProvider>
    </StrictMode>,
)
