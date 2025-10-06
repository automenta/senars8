import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useSearch} from '../../context/SearchContext.jsx';
import {Brain, FileText, Globe, Search as SearchIcon, X, Zap} from 'lucide-react';
import './style.css';

const SCOPE_OPTIONS = [
    {id: 'all', label: 'All', Icon: Globe},
    {id: 'memory', label: 'Memory', Icon: Brain},
    {id: 'files', label: 'Files', Icon: FileText},
    {id: 'reasoning', label: 'Reasoning', Icon: Zap},
];

const getIconForType = (type) => {
    const option = SCOPE_OPTIONS.find(opt => opt.id === type);
    return option ? <option.Icon size={16}/> : <Globe size={16}/>;
};

const ScopeButton = React.memo(({scope, activeScope, onClick, Icon, children}) => (
    <button
        type="button"
        className={`scope-option ${activeScope === scope ? 'active' : ''}`}
        onClick={() => onClick(scope)}
    >
        <Icon size={16}/> {children}
    </button>
));

const ResultsDisplay = React.memo(({isSearching, results, term}) => {
    if (isSearching) {
        return (
            <div className="searching-indicator">
                <div className="loading-spinner"></div>
                <span>Searching...</span>
            </div>
        );
    }
    if (results.length === 0 && term) {
        return <div className="no-results">No results found for "{term}"</div>;
    }
    if (results.length > 0) {
        return (
            <div className="results-list">
                {results.map((result) => (
                    <div key={result.id} className="search-result-item">
                        <div className="result-icon">{getIconForType(result.type)}</div>
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
        );
    }
    return null;
});

const GlobalSearch = () => {
    const {
        searchTerm,
        setSearchTerm,
        searchResults,
        isSearching,
        searchScope,
        setSearchScope,
        performSearch,
        clearSearch
    } = useSearch();
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 0);
        }
    }, [isOpen]);

    const handleSearch = useCallback((e) => {
        e.preventDefault();
        performSearch(searchTerm, searchScope);
    }, [performSearch, searchTerm, searchScope]);

    const handleClear = useCallback(() => {
        clearSearch();
        setSearchTerm('');
    }, [clearSearch, setSearchTerm]);

    return (
        <div className="global-search-container">
            <button className="global-search-trigger" onClick={() => setIsOpen(true)} title="Global Search (Ctrl+K)">
                <SearchIcon size={16}/>
                <span>Search (Ctrl+K)</span>
            </button>

            {isOpen && (
                <div className="global-search-overlay">
                    <div className="global-search-modal">
                        <form onSubmit={handleSearch} className="search-form">
                            <div className="search-input-container">
                                <SearchIcon size={20} className="search-icon"/>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search across SeNARS..."
                                    className="global-search-input"
                                />
                                {searchTerm && (
                                    <button type="button" className="clear-search-button" onClick={handleClear}
                                            title="Clear search">
                                        <X size={16}/>
                                    </button>
                                )}
                            </div>

                            <div className="search-scope-selector">
                                {SCOPE_OPTIONS.map(({id, label, Icon}) => (
                                    <ScopeButton key={id} scope={id} activeScope={searchScope} onClick={setSearchScope}
                                                 Icon={Icon}>
                                        {label}
                                    </ScopeButton>
                                ))}
                            </div>
                        </form>

                        {(searchTerm || searchResults.length > 0) && (
                            <div className="search-results">
                                <ResultsDisplay isSearching={isSearching} results={searchResults} term={searchTerm}/>
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