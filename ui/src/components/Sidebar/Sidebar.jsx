import React from 'react';
import { Actions } from 'flexlayout-react';
import { categorizedPanels } from '@/features/panelRegistry';
import './Sidebar.css';

const Sidebar = ({ model, onModelChange }) => {
    const addPanel = (panelId, panelName) => {
        if (model) {
            const action = Actions.addNode(
                {
                    type: 'tab',
                    component: panelId,
                    name: panelName,
                },
                'main-tabset',
                'last',
                0
            );
            onModelChange(model.doAction(action));
        }
    };

    return (
        <div className="sidebar">
            <nav className="sidebar-nav">
                {Object.entries(categorizedPanels).map(([category, panels]) => (
                    <div key={category} className="sidebar-category">
                        <h3>{category}</h3>
                        <ul>
                            {Object.entries(panels).map(([panelId, { name }]) => (
                                <li key={panelId}>
                                    <button onClick={() => addPanel(panelId, name)}>
                                        {name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </nav>
        </div>
    );
};

export default Sidebar;