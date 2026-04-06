import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface FilterState {
  timeFilter: string;
  regionFilter: string;
  sentimentFilter: string;
  searchQuery: string;
}

interface FilterContextType extends FilterState {
  setTimeFilter: (val: string) => void;
  setRegionFilter: (val: string) => void;
  setSentimentFilter: (val: string) => void;
  setSearchQuery: (val: string) => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

const DEFAULT_FILTERS: FilterState = {
  timeFilter: '7 Hari',
  regionFilter: 'Semua',
  sentimentFilter: 'Semua',
  searchQuery: '',
};

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state from URL or defaults
  const [state, setState] = useState<FilterState>(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      timeFilter: params.get('time') || DEFAULT_FILTERS.timeFilter,
      regionFilter: params.get('region') || DEFAULT_FILTERS.regionFilter,
      sentimentFilter: params.get('sentiment') || DEFAULT_FILTERS.sentimentFilter,
      searchQuery: params.get('q') || DEFAULT_FILTERS.searchQuery,
    };
  });

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (state.timeFilter !== DEFAULT_FILTERS.timeFilter) params.set('time', state.timeFilter);
    if (state.regionFilter !== DEFAULT_FILTERS.regionFilter) params.set('region', state.regionFilter);
    if (state.sentimentFilter !== DEFAULT_FILTERS.sentimentFilter) params.set('sentiment', state.sentimentFilter);
    if (state.searchQuery !== DEFAULT_FILTERS.searchQuery) params.set('q', state.searchQuery);

    const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState(null, '', newRelativePathQuery);
  }, [state]);

  const setTimeFilter = useCallback((val: string) => setState(prev => ({ ...prev, timeFilter: val })), []);
  const setRegionFilter = useCallback((val: string) => setState(prev => ({ ...prev, regionFilter: val })), []);
  const setSentimentFilter = useCallback((val: string) => setState(prev => ({ ...prev, sentimentFilter: val })), []);
  const setSearchQuery = useCallback((val: string) => setState(prev => ({ ...prev, searchQuery: val })), []);
  
  const resetFilters = useCallback(() => setState(DEFAULT_FILTERS), []);

  return (
    <FilterContext.Provider value={{ 
      ...state, 
      setTimeFilter, 
      setRegionFilter, 
      setSentimentFilter, 
      setSearchQuery, 
      resetFilters 
    }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};
