import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SearchBar({ onSearch, isLoading }) {
    const [query, setQuery] = useState('');

    const suggestions = [
        "Your late night songs",
        "Your happiest days",
        "Songs that made me cry",
        "Workout energy 10/10"
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setQuery(suggestion);
        onSearch(suggestion);
    };

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
            <form onSubmit={handleSubmit} className="relative w-full">
                <input 
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Talk to your past through music..."
                    className="w-full bg-white/5 border border-white/20 rounded-2xl py-4 pl-6 pr-16 text-white text-lg focus:outline-none focus:border-white/50 focus:bg-white/10 backdrop-blur-md transition-all shadow-xl"
                />
                
                <button 
                    type="submit"
                    disabled={isLoading || !query.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-white text-black rounded-xl font-bold transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                    {isLoading ? (
                        <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    )}
                </button>
            </form>

            <AnimatePresence>
                {!query && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-wrap gap-2 md:justify-center mt-2"
                    >
                        {suggestions.map((suggestion, i) => (
                            <motion.button
                                key={i}
                                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="px-4 py-2 border border-white/10 rounded-full text-xs font-mono tracking-wider text-white/50 hover:border-white/30 hover:text-white transition-all bg-white/5 backdrop-blur-sm shadow-sm"
                            >
                                {suggestion}
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
