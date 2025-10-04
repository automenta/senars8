import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeProvider';
import { AgentProvider } from './context/AgentProvider';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
    <React.StrictMode>
        <ThemeProvider>
            <AgentProvider>
                <App />
            </AgentProvider>
        </ThemeProvider>
    </React.StrictMode>
);