import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Panel} from '@ui/components';
import agentService from '@/services/agentService';
import notificationService from '@/services/notificationService';
import log from '@core/utils/logger.js';
import {AlertCircle, BrainCircuit, Filter, RotateCcw, Search} from 'lucide-react';
import './MemoryViewPanel.css';

function MemoryViewPanel() {
    const [workingMemory, setWorkingMemory] = useState([]);
    const [longTermMemory, setLongTermMemory] = useState([]);
    const [filter, setFilter] = useState('');
    const [activeTab, setActiveTab] = useState('working'); // 'working' or 'long-term'
    const [sortBy, setSortBy] = useState('confidence'); // 'confidence' or 'timestamp'
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

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
            if (Array.isArray(data)) {
                setWorkingMemory(prev => {
                    // Ensure we don't duplicate items
                    const existingIds = new Set(prev.map(item => item.id));
                    const newItems = data.filter(item => item.id && !existingIds.has(item.id));
                    return [...prev, ...newItems];
                });
            }
        };

        const handleLongTermMemoryUpdate = (data) => {
            if (Array.isArray(data)) {
                setLongTermMemory(prev => {
                    // Ensure we don't duplicate items
                    const existingIds = new Set(prev.map(item => item.id));
                    const newItems = data.filter(item => item.id && !existingIds.has(item.id));
                    return [...prev, ...newItems];
                });
            }
        };

        const handleError = (error) => {
            console.error('Memory panel error:', error);
            setError(error);
            setIsLoading(false);
        };

        agentService.on('working_memory_update', handleWorkingMemoryUpdate);
        agentService.on('long_term_memory_update', handleLongTermMemoryUpdate);
        agentService.on('error', handleError);

        // Request initial memory data
        setIsLoading(true);
        const success1 = agentService.sendMessage('get_memory_data', {type: 'working'});
        const success2 = agentService.sendMessage('get_memory_data', {type: 'long_term'});

        if (!success1 || !success2) {
            setError('Failed to request initial memory data. Retrying...');
            // Try again after a short delay
            setTimeout(() => {
                agentService.sendMessage('get_memory_data', {type: 'working'});
                agentService.sendMessage('get_memory_data', {type: 'long_term'});
            }, 1000);
        }

        return () => {
            agentService.off('working_memory_update', handleWorkingMemoryUpdate);
            agentService.off('long_term_memory_update', handleLongTermMemoryUpdate);
            agentService.off('error', handleError);
        };
    }, []);

    const refreshData = () => {
        try {
            setIsLoading(true);
            setError(null);
            const success1 = agentService.sendMessage('get_memory_data', {type: 'working'}, {
                expectResponse: true,
                timeout: 10000
            });
            const success2 = agentService.sendMessage('get_memory_data', {type: 'long_term'}, {
                expectResponse: true,
                timeout: 10000
            });

            if (!success1 || !success2) {
                notificationService.addWarning('Memory', 'Failed to request memory data. Check connection.');
            } else {
                notificationService.addInfo('Memory', 'Refreshing memory data...');
            }

            // Set timeout to stop loading indicator if response doesn't come
            setTimeout(() => {
                if (isLoading) {
                    setIsLoading(false);
                }
            }, 10000);
        } catch (error) {
            log.error('Error refreshing memory data:', error);
            setError('Error refreshing memory data');
            notificationService.addError('Memory Refresh Error', 'Failed to refresh memory data');
            setIsLoading(false);
        }
    };

    const currentMemory = activeTab === 'working' ? workingMemory : longTermMemory;
    const filteredMemory = useMemo(() => {
        try {
            return filterAndSortMemory(currentMemory);
        } catch (error) {
            log.error('Error filtering and sorting memory:', error);
            notificationService.addError('Memory Filter Error', 'Error filtering memory items');
            return [];
        }
    }, [currentMemory, filterAndSortMemory]);

    const handleClearMemory = () => {
        if (window.confirm(`Are you sure you want to clear ${activeTab} memory?`)) {
            try {
                agentService.sendMessage('clear_memory', {type: activeTab});
                if (activeTab === 'working') {
                    setWorkingMemory([]);
                } else {
                    setLongTermMemory([]);
                }
                notificationService.addWarning('Memory', `${activeTab} memory cleared`);
            } catch (error) {
                log.error('Error clearing memory:', error);
                notificationService.addError('Memory Clear Error', 'Error clearing memory');
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
                {/* Controls and Status */}
                <div className="memory-header">
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

                    <div className="memory-actions">
                        <button
                            className="refresh-btn"
                            onClick={refreshData}
                            title="Refresh memory data"
                            disabled={isLoading}
                        >
                            <RotateCcw size={16} className={isLoading ? 'spinning' : ''}/>
                            {isLoading ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {/* Controls */}
                <div className="memory-controls">
                    <div className="filter-container">
                        <Search size={16}/>
                        <input
                            type="text"
                            placeholder="Filter by content..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="memory-filter"
                        />
                    </div>

                    <div className="sort-container">
                        <Filter size={16}/>
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

                {/* Error Display */}
                {error && (
                    <div className="memory-error">
                        <AlertCircle size={16} className="error-icon"/>
                        <span className="error-message">{error.toString()}</span>
                        <button
                            className="retry-btn"
                            onClick={refreshData}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Memory List */}
                <div className="memory-content">
                    {filteredMemory.length > 0 ? (
                        <ul className="memory-list">
                            {filteredMemory.slice(0, 100).map((item, index) => (  // Limit to first 100 items for performance
                                <li key={item.id || `item-${index}`} className="memory-item">
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
                            {filteredMemory.length > 100 && (
                                <li className="memory-item info">
                                    Showing 100 of {filteredMemory.length} items. Please refine your filter.
                                </li>
                            )}
                        </ul>
                    ) : isLoading ? (
                        <div className="memory-loading">
                            <div className="loading-spinner"></div>
                            <span>Loading memory data...</span>
                        </div>
                    ) : (
                        <div className="memory-empty">
                            {error ? 'Failed to load memory data. Please refresh.' :
                                filter ? 'No matching items found.' : `No items in ${activeTab} memory.`}
                        </div>
                    )}
                </div>
            </div>
        </Panel>
    );
}

export default MemoryViewPanel;