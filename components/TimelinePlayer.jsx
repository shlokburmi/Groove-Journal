import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TimelineControls from './TimelineControls';
import TimelineCard from './TimelineCard';

export default function TimelinePlayer({ entries, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [speed, setSpeed] = useState(1); // 1x, 1.5x, 2x
    const [progress, setProgress] = useState(0); 

    const audioRef = useRef(null);
    let autoAdvanceTimer = useRef(null);

    const currentEntry = entries[currentIndex];

    // Main Playback Loop Orchestrator
    useEffect(() => {
        if (!currentEntry || !isPlaying) {
            clearTimeout(autoAdvanceTimer.current);
            cancelAnimationFrame(autoAdvanceTimer.current);
            if (audioRef.current) audioRef.current.pause();
            return;
        }

        const runPlayback = async () => {
            if (currentEntry.audioData) {
                audioRef.current.src = currentEntry.audioData;
                audioRef.current.currentTime = currentEntry.clipStart || 0;
                audioRef.current.playbackRate = speed;
                
                try {
                    await audioRef.current.play();
                } catch (e) {
                    console.log("Auto-play blocked. Awaiting user interaction.");
                    setIsPlaying(false);
                }
            } else {
                // Simulated Playback for 8 seconds
                const BASE_DURATION = 8000; 
                let startTime = Date.now();
                
                const updateFakeProgress = () => {
                    if (!isPlaying) return;
                    let elapsed = Date.now() - startTime;
                    let cap = BASE_DURATION / speed;
                    if (elapsed >= cap) {
                        handleNext();
                    } else {
                        setProgress((elapsed / cap) * 100);
                        autoAdvanceTimer.current = requestAnimationFrame(updateFakeProgress);
                    }
                };
                autoAdvanceTimer.current = requestAnimationFrame(updateFakeProgress);
            }
        };

        runPlayback();

        return () => {
            clearTimeout(autoAdvanceTimer.current);
            cancelAnimationFrame(autoAdvanceTimer.current);
        };
    }, [currentIndex, isPlaying, speed, currentEntry]);

    const handleTimeUpdate = () => {
        if (!audioRef.current || !currentEntry) return;
        const current = audioRef.current.currentTime;
        const end = currentEntry.clipEnd || audioRef.current.duration;
        const start = currentEntry.clipStart || 0;
        
        const totalDuration = end - start;
        const elapsed = current - start;
        
        setProgress((elapsed / totalDuration) * 100);

        if (current >= end) {
            handleNext();
        }
    };

    const handleNext = () => {
        if (currentIndex < entries.length - 1) {
            setProgress(0);
            setCurrentIndex(prev => prev + 1);
        } else {
            setIsPlaying(false);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setProgress(0);
            setCurrentIndex(prev => prev - 1);
        }
    };

    if (!entries.length) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden font-sans">
            <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} className="hidden" />

            <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white z-50 text-xl font-bold bg-transparent border-none cursor-pointer">
                ✕
            </button>

            {/* Cinematic Slide Transition */}
            <AnimatePresence mode="wait">
                <TimelineCard key={currentIndex} entry={currentEntry} />
            </AnimatePresence>

            <TimelineControls 
                progress={progress}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                onNext={handleNext}
                onPrev={handlePrev}
                speed={speed}
                onSpeedToggle={() => setSpeed(speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1)}
                hasNext={currentIndex < entries.length - 1}
                hasPrev={currentIndex > 0}
            />
        </div>
    );
}
