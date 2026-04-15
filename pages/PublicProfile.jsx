import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ProfileCard from '../components/ProfileCard';
import TimelinePlayer from '../components/TimelinePlayer';

export default function PublicProfile({ match }) {
    const username = match?.params?.username || window.location.pathname.split('/').pop();
    const currentUserId = 'your_local_auth_id'; // In a real app, from auth context
    
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showTimeline, setShowTimeline] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

    useEffect(() => {
        // Mock fetch format, usually hits /api/userRoutes mounted inside Express
        fetch(`/api/user/${username}`)
            .then(res => {
                if (!res.ok) throw new Error(res.status === 403 ? 'Private Profile' : 'Not found');
                return res.json();
            })
            .then(data => {
                setProfileData(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [username]);

    const handleFollow = async () => {
        setIsFollowing(!isFollowing); // Optimistic UI update
        try {
            await fetch(`/api/user/${username}/follow`, {
                method: 'POST',
                headers: { 'x-user-id': currentUserId }
            });
        } catch (e) {
            console.error('Follow failed', e);
            setIsFollowing(!isFollowing); // Revert
        }
    };

    if (loading) return <div className="min-h-screen bg-[#111113] flex items-center justify-center text-white font-mono">Loading...</div>;
    
    if (error) return (
        <div className="min-h-screen bg-[#111113] flex flex-col items-center justify-center text-white">
            <h1 className="text-4xl font-serif mb-4">Oops!</h1>
            <p className="text-white/50">{error}</p>
        </div>
    );

    const { user, stats, publicEntries } = profileData;

    return (
        <div className="min-h-screen bg-[#111113] text-white font-sans p-6 md:p-12 overflow-x-hidden">
            
            <div className="max-w-5xl mx-auto">
                {/* Profile Header section */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                    <ProfileCard 
                        user={user} 
                        stats={stats} 
                        isFollowing={isFollowing}
                        onFollow={handleFollow}
                    />
                </motion.div>

                {/* Timeline trigger */}
                {publicEntries.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                        className="mt-12 mb-8 flex justify-between items-end"
                    >
                        <h2 className="text-2xl font-serif">Recent Memories</h2>
                        <button 
                            onClick={() => setShowTimeline(true)}
                            className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold hover:scale-105 active:scale-95 transition-transform"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            Play Timeline
                        </button>
                    </motion.div>
                )}

                {/* Entries Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {publicEntries.map((entry, index) => (
                        <motion.div 
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + (index * 0.1) }}
                            className="group relative aspect-square rounded-2xl overflow-hidden bg-black/40 border border-white/10 hover:border-white/30 transition-colors"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end">
                                <div className="text-xs text-white/50 font-mono mb-2">{new Date(entry.date).toLocaleDateString()}</div>
                                <h3 className="text-lg font-serif leading-tight mb-1 truncate">{entry.title || 'Untitled'}</h3>
                                <p className="text-sm font-sans text-white/60 truncate">{entry.artist}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Launch Timeline Player safely isolated inside modal wrapper */}
            {showTimeline && (
                <TimelinePlayer 
                    entries={publicEntries} // Uses timeline player from Feature 3
                    onClose={() => setShowTimeline(false)} 
                />
            )}
        </div>
    );
}
