import React from 'react';
import { motion } from 'framer-motion';

export default function TimelineCard({ entry }) {
    // Dynamic mood-based background gradients to simulate album art blur shifts
    const getMoodGradient = (mood, color) => {
        const baseColor = color || '#333';
        const moodMap = {
            happy: 'radial-gradient(circle at top right, rgba(255, 123, 114, 0.4), transparent), ',
            sad: 'radial-gradient(circle at bottom left, rgba(121, 192, 255, 0.4), transparent), ',
            calm: 'radial-gradient(circle at center, rgba(232, 213, 183, 0.3), transparent), ',
            energetic: 'radial-gradient(circle at top left, rgba(210, 168, 255, 0.5), transparent), '
        };
        const overlay = moodMap[mood] || '';
        return `${overlay}linear-gradient(to bottom, transparent, #000 90%), radial-gradient(circle, ${baseColor} 0%, #111 100%)`;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 flex flex-col items-center justify-center p-8 w-full h-full"
            style={{ background: getMoodGradient(entry.mood, entry.color) }}
        >
            {/* Cinematic Date Overlay using Parallax */}
            <motion.div 
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 0.2 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="absolute top-10 text-[8vw] font-serif font-bold text-white uppercase tracking-widest select-none pointer-events-none"
            >
                {formatDate(entry.date)}
            </motion.div>

            {/* Main Content Box */}
            <div className="z-10 text-center max-w-2xl w-full">
                
                {entry.mood && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mb-6 inline-block"
                    >
                        <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-mono uppercase tracking-widest text-[#e8d5b7]">
                            Mood: {entry.mood}
                        </span>
                    </motion.div>
                )}

                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-4xl md:text-6xl font-serif text-white mb-2 leading-tight"
                >
                    {entry.title || 'Untitled Memory'}
                </motion.h1>

                {entry.artist && (
                    <motion.h2 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="text-xl md:text-2xl font-sans text-white/60 mb-8"
                    >
                        {entry.artist}
                    </motion.h2>
                )}

                {entry.note && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.7 }}
                        className="mt-8 p-6 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl"
                    >
                        <p className="text-lg md:text-xl font-sans text-white/90 leading-relaxed italic">
                            "{entry.note}"
                        </p>
                    </motion.div>
                )}
                
                {entry.tags && entry.tags.length > 0 && (
                    <div className="mt-8 flex justify-center gap-3">
                        {entry.tags.map((tag, i) => (
                            <motion.span 
                                key={i}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.8 + (i * 0.1) }}
                                className="text-xs text-zinc-400 font-mono tracking-wider"
                            >
                                #{tag}
                            </motion.span>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
