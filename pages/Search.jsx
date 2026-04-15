import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';

export default function Search({ currentUserId }) {
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async (query) => {
        setIsLoading(true);
        setError(null);
        setResults(null);

        try {
            const res = await fetch('/api/search', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-id': currentUserId // Replace with auth token
                },
                body: JSON.stringify({ query })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to search memories');

            setResults(data.results);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#111113] p-6 md:p-12 text-white overflow-x-hidden font-sans pt-32">
            
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto mb-16"
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-6">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                    <span className="text-xs font-mono uppercase tracking-widest text-[#79c0ff]">AI Smart Search</span>
                </div>
                
                <h1 className="text-4xl md:text-6xl font-serif mb-6 leading-tight">
                    Rediscover Your Life's Soundtrack.
                </h1>
                <p className="text-white/50 text-lg md:text-xl font-sans max-w-2xl mx-auto leading-relaxed">
                    Search by mood, weather, deep feelings, or specific moments. Our neural engine connects your thoughts directly to your musical memories.
                </p>
            </motion.div>

            {/* Smart Input Component */}
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />

            {/* Error UI */}
            {error && (
                <div className="mt-8 text-center text-red-400 max-w-md mx-auto p-4 bg-red-900/20 border border-red-500/20 rounded-xl">
                    <svg className="w-6 h-6 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    {error}
                </div>
            )}

            {/* Cinematic Results Engine */}
            <SearchResults 
                results={results} 
                onPlayEntry={(entry) => console.log('Inject into timeline or audio player:', entry)} 
            />

        </div>
    );
}
