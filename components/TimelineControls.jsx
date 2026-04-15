import React from 'react';
import { motion } from 'framer-motion';

export default function TimelineControls({ 
    progress, isPlaying, onTogglePlay, onNext, onPrev, speed, onSpeedToggle, hasNext, hasPrev 
}) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 z-50 flex flex-col items-center gap-4"
        >
            {/* Minimal Progress Bar */}
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden relative">
                <motion.div 
                    className="absolute top-0 left-0 h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                    style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                    transition={{ ease: "linear" }}
                />
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between w-full">
                
                {/* Speed Toggle */}
                <button 
                    onClick={onSpeedToggle}
                    className="w-12 text-xs font-mono text-white/50 hover:text-white transition-colors border border-white/20 rounded-full px-2 py-1"
                >
                    {speed}x
                </button>

                {/* Primary Playback controls */}
                <div className="flex items-center gap-6">
                    <button 
                        onClick={onPrev} 
                        disabled={!hasPrev}
                        className={`text-white transition-all transform hover:scale-110 active:scale-95 ${!hasPrev && 'opacity-30 cursor-not-allowed'}`}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                        </svg>
                    </button>

                    <button 
                        onClick={onTogglePlay} 
                        className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center transition-transform transform hover:scale-105 active:scale-95"
                    >
                        {isPlaying ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                            </svg>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        )}
                    </button>

                    <button 
                        onClick={onNext} 
                        disabled={!hasNext}
                        className={`text-white transition-all transform hover:scale-110 active:scale-95 ${!hasNext && 'opacity-30 cursor-not-allowed'}`}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                        </svg>
                    </button>
                </div>

                {/* Spacer to balance speed toggle width */}
                <div className="w-12"></div>
            </div>
        </motion.div>
    );
}
