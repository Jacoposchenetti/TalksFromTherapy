"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";

interface PlaceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export function PlaceAutocomplete({ value, onChange, placeholder, error }: PlaceAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock function per simulare chiamate a Google Places API
  // In produzione, questa dovrebbe chiamare l'API di Google Places
  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    // Simulazione di ricerca con timeout
    setTimeout(() => {
      const mockSuggestions = [
        `${query}, Milano, Italia`,
        `${query}, Roma, Italia`,
        `${query}, Napoli, Italia`,
        `${query}, Torino, Italia`,
        `${query}, Palermo, Italia`,
      ];
      setSuggestions(mockSuggestions);
      setIsLoading(false);
    }, 500);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    if (newValue.length >= 3) {
      setShowSuggestions(true);
      searchPlaces(newValue);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleBlur = () => {
    // Delay per permettere il click sui suggerimenti
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={() => value.length >= 3 && setShowSuggestions(true)}
        placeholder={placeholder}
        className={error ? 'border-red-500' : ''}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-2 text-center text-gray-500">
              Caricamento...
            </div>
          ) : (
            suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}