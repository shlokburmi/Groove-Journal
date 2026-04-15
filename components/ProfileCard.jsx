import React from 'react';
import { motion } from 'framer-motion';
import ShareButton from './ShareButton';

export default function ProfileCard({ user, stats, onFollow, isFollowing }) {
    return (
        <div className="relative p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
            {/* Ambient Background Glow based on top mood */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#d2a8ff] opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
                
                {/* Avatar (Placeholder if none) */}
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 shadow-lg shrink-0 bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center text-4xl text-white/30">
                    {user.profileImage ? (
                        <img src={user.profileImage} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                        <span>{user.username.charAt(0).toUpperCase()}</span>
                    )}
                </div>

                <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start">
                    <h1 className="text-3xl md:text-5xl font-serif text-white mb-2">@{user.username}</h1>
                    <p className="text-white/70 font-sans max-w-lg mb-6 leading-relaxed">
                        {user.bio || "No bio available."}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-6 mb-8 text-sm font-mono uppercase tracking-wider text-white/50">
                        <div className="flex flex-col">
                            <span className="text-xl text-white font-serif">{stats.totalEntries}</span>
                            <span>Memories</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl text-white font-serif">{user.followers || 0}</span>
                            <span>Followers</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap justify-center md:justify-start">
                        {onFollow && (
                            <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onFollow}
                                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                                    isFollowing 
                                    ? 'bg-transparent border border-white/30 text-white hover:bg-white/5' 
                                    : 'bg-white text-black hover:bg-zinc-200'
                                }`}
                            >
                                {isFollowing ? 'Following' : 'Follow'}
                            </motion.button>
                        )}
                        <ShareButton username={user.username} />
                    </div>
                </div>
            </div>
            
            {/* Top Moods Tags */}
            {stats.topMoods && stats.topMoods.length > 0 && (
                <div className="absolute top-6 right-6 flex flex-col md:flex-row gap-2 items-end md:items-center">
                    <span className="text-xs text-white/40 uppercase tracking-widest mr-2">Top Vibes</span>
                    {stats.topMoods.map(mood => (
                        <span key={mood} className="px-3 py-1 bg-white/10 rounded-full text-xs text-white capitalize border border-white/10 shadow-sm backdrop-blur-sm">
                            {mood}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
