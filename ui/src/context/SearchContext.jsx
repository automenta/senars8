import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import agentService from '@/services/agentService';
import { MESSAGE_TYPES } from '@/constants/ui';

const SearchContext = createContext();

export const useSearch = () => {
    const context = useContext(SearchContext);
    if (!context) {
        throw new Error('useSearch must be used within a SearchProvider');
    }
    return context;
};

export const SearchProvider = ({ children }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchScope, setSearchScope] = useState('all'); // 'all', 'memory', 'files', 'reasoning'

    // Listen for search results from agent service
    useEffect(() => {
        const handleSearchResults = (results) => {
            setSearchResults(Array.isArray(results) ? results : (results?.results || []));
            setIsSearching(false);
        };

        const handleSearchError = (error) => {
            console.error('Search error from agent:', error);
            setIsSearching(false);
        };

        // Subscribe to search result events using the proper message types
        agentService.on(MESSAGE_TYPES.SEARCH_RESULTS, handleSearchResults);
        agentService.on(MESSAGE_TYPES.SEARCH_ERROR, handleSearchError);

        // Cleanup
        return () => {
            agentService.off(MESSAGE_TYPES.SEARCH_RESULTS, handleSearchResults);
            agentService.off(MESSAGE_TYPES.SEARCH_ERROR, handleSearchError);
        };
    }, []);

    const performSearch = useCallback(async (term, scope = 'all') => {
        if (!term.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        setSearchTerm(term);
        setSearchScope(scope);

        try {
            // Use the agent service to perform the search
            const success = agentService.search(term, { scope });

            if (!success) {
                throw new Error('Failed to send search request');
            }
        } catch (error) {
            console.error('Search error:', error);
            setIsSearching(false);
        }
    }, []);

    const clearSearch = useCallback(() => {
        setSearchTerm('');
        setSearchResults([]);
        setIsSearching(false);
    }, []);

    const value = {
        searchTerm,
        setSearchTerm,
        searchResults,
        isSearching,
        searchScope,
        setSearchScope,
        performSearch,
        clearSearch
    };

    return (
        <SearchContext.Provider value={value}>
            {children}
        </SearchContext.Provider>
    );
};