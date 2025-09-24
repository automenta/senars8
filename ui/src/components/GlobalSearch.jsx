import React, { useState, useEffect, useRef } from 'react';
import { useSearch } from '@/context/SearchContext';
import { Search as SearchIcon, X, Globe, FileText, Brain, Zap } from 'lucide-react';
import './GlobalSearch.css';

const GlobalSearch = () => {
    const { searchTerm, setSearchTerm, searchResults, isSearching, searchScope, setSearchScope, performSearch, clearSearch } = useSearch();
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef(null);

    // Toggle search with Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
                if (!isOpen && inputRef.current) {
                    setTimeout(() => inputRef.current?.focus(), 0);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handleSearch = (e) => {
        e.preventDefault();
        performSearch(searchTerm, searchScope);
    };

    const handleClear = () => {
        clearSearch();
        setSearchTerm('');
    };

    const getIconForType = (type) => {
        switch (type) {
            case 'memory': return <Brain size={16} />;
            case 'file': return <FileText size={16} />;
            case 'reasoning': return <Zap size={16} />;
            default: return <Globe size={16} />;
        }
    };

    return (
        <div className="global-search-container">
            <button
                className="global-search-trigger"
                onClick={() => setIsOpen(true)}
                title="Global Search (Ctrl+K)"
            >
                <SearchIcon size={16} />
                <span>Search (Ctrl+K)</span>
            </button>

            {isOpen && (
                <div className="global-search-overlay">
                    <div className="global-search-modal">
                        <form onSubmit={handleSearch} className="search-form">
                            <div className="search-input-container">
                                <SearchIcon size={20} className="search-icon" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search across SeNARS..."
                                    className="global-search-input"
                                    autoFocus
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        className="clear-search-button"
                                        onClick={handleClear}
                                        title="Clear search"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            <div className="search-scope-selector">
                                <button
                                    type="button"
                                    className={`scope-option ${searchScope === 'all' ? 'active' : ''}`}
                                    onClick={() => setSearchScope('all')}
                                >
                                    <Globe size={16} /> All
                                </button>
                                <button
                                    type="button"
                                    className={`scope-option ${searchScope === 'memory' ? 'active' : ''}`}
                                    onClick={() => setSearchScope('memory')}
                                >
                                    <Brain size={16} /> Memory
                                </button>
                                <button
                                    type="button"
                                    className={`scope-option ${searchScope === 'files' ? 'active' : ''}`}
                                    onClick={() => setSearchScope('files')}
                                >
                                    <FileText size={16} /> Files
                                </button>
                                <button
                                    type="button"
                                    className={`scope-option ${searchScope === 'reasoning' ? 'active' : ''}`}
                                    onClick={() => setSearchScope('reasoning')}
                                >
                                    <Zap size={16} /> Reasoning
                                </button>
                            </div>

                            <button type="submit" className="search-submit-button" disabled={isSearching}>
                                {isSearching ? 'Searching...' : 'Search'}
                            </button>
                        </form>

                        {(searchTerm || searchResults.length > 0) && (
                            <div className="search-results">
                                {isSearching ? (
                                    <div className="searching-indicator">
                                        <div className="loading-spinner"></div>
                                        <span>Searching...</span>
                                    </div>
                                ) : searchResults.length === 0 && searchTerm ? (
                                    <div className="no-results">
                                        No results found for "{searchTerm}"
                                    </div>
                                ) : (
                                    <div className="results-list">
                                        {searchResults.map((result) => (
                                            <div key={result.id} className="search-result-item">
                                                <div className="result-icon">
                                                    {getIconForType(result.type)}
                                                </div>
                                                <div className="result-content">
                                                    <div className="result-title">{result.content}</div>
                                                    <div className="result-meta">
                                                        {result.source && `Source: ${result.source}`}
                                                        {result.location && `Location: ${result.location}`}
                                                        {result.step && `Step: ${result.step}`}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="search-overlay-backdrop" onClick={() => setIsOpen(false)}></div>
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;