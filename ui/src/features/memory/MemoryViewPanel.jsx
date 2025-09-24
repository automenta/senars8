import React, {useEffect, useState, useCallback} from 'react';
import Panel from '@/components/Panel';
import agentService from '@/services/agentService';
import {BrainCircuit, Search, Filter} from 'lucide-react';
import './MemoryViewPanel.css';

function MemoryViewPanel() {
    const [workingMemory, setWorkingMemory] = useState([]);
    const [longTermMemory, setLongTermMemory] = useState([]);
    const [filter, setFilter] = useState('');
    const [activeTab, setActiveTab] = useState('working'); // 'working' or 'long-term'
    const [sortBy, setSortBy] = useState('confidence'); // 'confidence' or 'timestamp'

    // Filter and sort memory items
    const filterAndSortMemory = useCallback((memory) => {
        let filtered = memory;
        
        // Apply filter
        if (filter) {
            filtered = memory.filter(item => 
                item.statement?.toLowerCase().includes(filter.toLowerCase()) ||
                item.term?.toLowerCase().includes(filter.toLowerCase())
            );
        }
        
        // Apply sorting
        if (sortBy === 'confidence') {
            filtered.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
        } else if (sortBy === 'timestamp') {
            filtered.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        }
        
        return filtered;
    }, [filter, sortBy]);

    useEffect(() => {
        const handleWorkingMemoryUpdate = (data) => {
            setWorkingMemory(prev => {
                // Ensure we don't duplicate items
                const existingIds = new Set(prev.map(item => item.id));
                const newItems = data.filter(item => !existingIds.has(item.id));
                return [...prev, ...newItems];
            });
        };

        const handleLongTermMemoryUpdate = (data) => {
            setLongTermMemory(prev => {
                // Ensure we don't duplicate items
                const existingIds = new Set(prev.map(item => item.id));
                const newItems = data.filter(item => !existingIds.has(item.id));
                return [...prev, ...newItems];
            });
        };

        agentService.on('working_memory_update', handleWorkingMemoryUpdate);
        agentService.on('long_term_memory_update', handleLongTermMemoryUpdate);
        
        // Request initial memory data
        agentService.sendMessage('get_memory_data', {type: 'working'});
        agentService.sendMessage('get_memory_data', {type: 'long_term'});
        
        return () => {
            agentService.off('working_memory_update', handleWorkingMemoryUpdate);
            agentService.off('long_term_memory_update', handleLongTermMemoryUpdate);
        };
    }, []);

    const currentMemory = activeTab === 'working' ? workingMemory : longTermMemory;
    const filteredMemory = filterAndSortMemory(currentMemory);

    const handleClearMemory = () => {
        if (window.confirm(`Are you sure you want to clear ${activeTab} memory?`)) {
            agentService.sendMessage('clear_memory', {type: activeTab});
            if (activeTab === 'working') {
                setWorkingMemory([]);
            } else {
                setLongTermMemory([]);
            }
        }
    };

    const formatConfidence = (confidence) => {
        return confidence ? confidence.toFixed(3) : 'N/A';
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleTimeString();
    };

    return (
        <Panel title={<><BrainCircuit size={18}/> Memory</>}>
            <div className="memory-panel">
                {/* Tabs */}
                <div className="memory-tabs">
                    <button 
                        className={`tab ${activeTab === 'working' ? 'active' : ''}`}
                        onClick={() => setActiveTab('working')}
                    >
                        Working Memory ({workingMemory.length})
                    </button>
                    <button 
                        className={`tab ${activeTab === 'long-term' ? 'active' : ''}`}
                        onClick={() => setActiveTab('long-term')}
                    >
                        Long-term Memory ({longTermMemory.length})
                    </button>
                </div>

                {/* Controls */}
                <div className="memory-controls">
                    <div className="filter-container">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Filter by content..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="memory-filter"
                        />
                    </div>
                    
                    <div className="sort-container">
                        <Filter size={16} />
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                            className="memory-sort"
                        >
                            <option value="confidence">Sort by Confidence</option>
                            <option value="timestamp">Sort by Time</option>
                        </select>
                    </div>
                    
                    <button 
                        onClick={handleClearMemory}
                        className="clear-memory-btn"
                    >
                        Clear {activeTab}
                    </button>
                </div>

                {/* Memory List */}
                <div className="memory-content">
                    {filteredMemory.length > 0 ? (
                        <ul className="memory-list">
                            {filteredMemory.map((item, index) => (
                                <li key={item.id || index} className="memory-item">
                                    <div className="memory-statement">
                                        {item.statement || item.term || 'Unknown item'}
                                    </div>
                                    <div className="memory-meta">
                                        <span className="confidence">
                                            Confidence: {formatConfidence(item.confidence)}
                                        </span>
                                        <span className="timestamp">
                                            {formatTimestamp(item.timestamp)}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="memory-empty">
                            {filter ? 'No matching items found.' : `No items in ${activeTab} memory.`}
                        </div>
                    )}
                </div>
            </div>
        </Panel>
    );
}

export default MemoryViewPanel;