import React, { useState, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (searchTerm: string) => void;
  debounceMs?: number;
  fetchSuggestions?: (term: string) => Promise<Array<{ id: string; label: string }>>;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search...',
  onSearch,
  debounceMs = 300,
  fetchSuggestions,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; label: string }>>([]);
  const [open, setOpen] = useState(false);

  // Load suggestions only (do not auto-trigger search)
  useEffect(() => {
    const load = async () => {
      if (!fetchSuggestions) return;
      const q = debouncedSearchTerm.trim();
      if (q.length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      try {
        const items = await fetchSuggestions(q);
        setSuggestions(items.slice(0, 6));
        setOpen(items.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    };
    load();
  }, [debouncedSearchTerm, fetchSuggestions]);

  const handleClear = () => {
    setSearchTerm('');
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
            onFocus={() => setOpen(suggestions.length > 0)}
            className="w-full px-4 py-2 pl-10 pr-24 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <svg
        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      {searchTerm && (
        <button
          onClick={handleClear}
              className="absolute right-20 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          &times;
        </button>
      )}
          {open && suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow max-h-56 overflow-auto">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSearchTerm(s.label);
                    setOpen(false);
                    onSearch(s.label);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => onSearch(searchTerm.trim())}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Search
        </button>
      </div>
    </div>
  );
};
