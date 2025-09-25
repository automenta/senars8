import React, {useState} from 'react';
import {Panel} from '@ui/components';
import {Layout, Brain, BarChart3, MessageSquare, Database, Zap, Settings, FileText, FolderOpen, Terminal, Code, Book, Cpu, Lightbulb, Activity, Users} from 'lucide-react';
import './SidebarPanel.css';

const SidebarPanel = ({onPanelSelect, currentPanel = 'dashboard'}) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const panelGroups = [
        {
            name: 'Overview',
            items: [
                {id: 'dashboard', name: 'Dashboard', icon: BarChart3},
                {id: 'status', name: 'Status', icon: Activity},
                {id: 'chat', name: 'Chat', icon: MessageSquare},
            ]
        },
        {
            name: 'Knowledge & Memory',
            items: [
                {id: 'knowledge-graph', name: 'Knowledge Graph', icon: Brain},
                {id: 'memory', name: 'Memory View', icon: Database},
                {id: 'narsese-tasks', name: 'NARS Tasks', icon: Lightbulb},
                {id: 'task-inspector', name: 'Task Inspector', icon: Lightbulb},
            ]
        },
        {
            name: 'Reasoning',
            items: [
                {id: 'reasoner-trace', name: 'Reasoner Trace', icon: Zap},
                {id: 'reasoning-debugger', name: 'Reasoning Debugger', icon: Zap},
                {id: 'visual-reasoning', name: 'Visual Reasoning', icon: Zap},
            ]
        },
        {
            name: 'System',
            items: [
                {id: 'control', name: 'Control', icon: Cpu},
                {id: 'log', name: 'Event Log', icon: FileText},
                {id: 'configuration', name: 'Configuration', icon: Settings},
            ]
        },
        {
            name: 'Development',
            items: [
                {id: 'code-editor', name: 'Code Editor', icon: Code},
                {id: 'terminal', name: 'Terminal', icon: Terminal},
                {id: 'file-explorer', name: 'File Explorer', icon: FolderOpen},
                {id: 'help', name: 'Help', icon: Book},
            ]
        },
        {
            name: 'Utilities',
            items: [
                {id: 'sessions', name: 'Sessions', icon: Users},
                {id: 'layout-manager', name: 'Layout Manager', icon: Layout},
                {id: 'notifications', name: 'Notifications', icon: Users},
                {id: 'settings', name: 'Settings', icon: Settings},
            ]
        }
    ];

    const allPanels = panelGroups.flatMap(group => group.items);

    // Filter panels based on search
    const filteredPanels = searchTerm 
        ? allPanels.filter(panel => 
            panel.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : allPanels;

    const handlePanelSelect = (panelId) => {
        onPanelSelect(panelId);
    };

    return (
        <Panel title="Navigation">
            <div className="sidebar-panel">
                {/* Search */}
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search panels..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                {/* Panel List */}
                <div className="panel-list">
                    {searchTerm ? (
                        // Show search results
                        <div className="panel-group">
                            <h3>Search Results</h3>
                            {filteredPanels.length > 0 ? (
                                filteredPanels.map(panel => {
                                    const Icon = panel.icon;
                                    return (
                                        <button
                                            key={panel.id}
                                            className={`panel-item ${currentPanel === panel.id ? 'active' : ''}`}
                                            onClick={() => handlePanelSelect(panel.id)}
                                        >
                                            <Icon size={16} />
                                            <span>{panel.name}</span>
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="no-results">
                                    No panels found for "{searchTerm}"
                                </div>
                            )}
                        </div>
                    ) : (
                        // Show grouped panels
                        panelGroups.map(group => (
                            <div key={group.name} className="panel-group">
                                <h3>{group.name}</h3>
                                {group.items.map(panel => {
                                    const Icon = panel.icon;
                                    return (
                                        <button
                                            key={panel.id}
                                            className={`panel-item ${currentPanel === panel.id ? 'active' : ''}`}
                                            onClick={() => handlePanelSelect(panel.id)}
                                        >
                                            <Icon size={16} />
                                            <span>{panel.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

                {/* Quick Actions */}
                <div className="quick-actions">
                    <button 
                        className="action-btn"
                        onClick={() => onPanelSelect('dashboard')}
                    >
                        <BarChart3 size={14} />
                        Dashboard
                    </button>
                    <button 
                        className="action-btn"
                        onClick={() => onPanelSelect('configuration')}
                    >
                        <Settings size={14} />
                        Config
                    </button>
                    <button 
                        className="action-btn"
                        onClick={() => onPanelSelect('help')}
                    >
                        <Book size={14} />
                        Help
                    </button>
                </div>
            </div>
        </Panel>
    );
};

export default SidebarPanel;