import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ShareButton({ username }) {
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        const link = `${window.location.origin}/u/${username}`;
        
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'My Music Journal on Groove',
                    text: `Listen to my life's soundtrack on Groove Journal!`,
                    url: link
                });
            } else {
                // Fallback to clipboard copied
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    return (
        <div className="relative inline-block">
            <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-sm font-medium transition-colors backdrop-blur-md text-white"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                Share Profile
            </motion.button>

            {/* Toast for copy fallback */}
            <AnimatePresence>
                {copied && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: -45, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute left-1/2 -translate-x-1/2 px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-md shadow-lg whitespace-nowrap"
                    >
                        Link Copied!
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
