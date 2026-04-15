import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SearchResults({ results, onPlayEntry }) {
    if (!results) return null;

    if (results.length === 0) {
        return (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="w-full text-center py-20 text-white/50 font-sans"
            >
                No similar memories found. Try rephrasing your feelings.
            </motion.div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="w-full max-w-5xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
            <AnimatePresence>
                {results.map((result, index) => (
                    <motion.div 
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.1 }}
                        className="group relative p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 backdrop-blur-md shadow-2xl transition-all cursor-pointer flex flex-col gap-4"
                        onClick={() => onPlayEntry && onPlayEntry(result)}
                    >
                        {/* Similarity Glow Indicator (Green to Blue based on score length) */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500 opacity-5 rounded-full blur-3xl group-hover:opacity-20 transition-opacity"></div>

                        <div className="flex justify-between items-start z-10">
                            <div>
                                <h3 className="text-2xl font-serif text-white mb-1 leading-tight">{result.title || 'Unknown Audio'}</h3>
                                <p className="text-white/60 font-sans">{result.artist || 'Unknown Artist'}</p>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                                <span className="text-xs font-mono text-white/40 tracking-widest uppercase">
                                    {new Date(result.date).toLocaleDateString()}
                                </span>
                                {result.mood && (
                                    <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold text-[#d2a8ff] border border-white/10 uppercase tracking-widest">
                                        {result.mood}
                                    </span>
                                )}
                            </div>
                        </div>

                        {result.note && (
                            <p className="text-white/80 italic font-sans mt-2 border-l-2 border-white/20 pl-4 z-10 line-clamp-3">
                                "{result.note}"
                            </p>
                        )}
                        
                        <div className="mt-auto pt-4 flex gap-2 z-10 flex-wrap">
                            {result.tags && result.tags.map((tag, i) => (
                                <span key={i} className="text-xs text-zinc-500 font-mono">#{tag}</span>
                            ))}
                        </div>

                        {/* Similarity Score UI */}
                        <div className="absolute bottom-6 right-6 flex items-center gap-2">
                            <div className="bg-black/50 px-2 py-1 rounded text-[10px] text-zinc-400 border border-white/5 flex items-center gap-1 font-mono hover:text-white transition-colors">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                                {Math.round(result.similarityScore * 100)}% Match
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </motion.div>
    );
}
