import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function ProfileSettings({ currentUserId }) {
    const [formData, setFormData] = useState({
        username: '',
        bio: '',
        isPublic: true
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);

    // Initial fetch to populate fields
    useEffect(() => {
        // Mock profile fetch from auth/user logic
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            const res = await fetch(`/api/user/profile`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-id': currentUserId 
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update settings');

            setStatus({ type: 'success', msg: 'Profile updated successfully!' });
        } catch (err) {
            setStatus({ type: 'error', msg: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#111113] text-white p-6 md:p-12 font-sans flex justify-center items-start pt-24">
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xl p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl"
            >
                <h1 className="text-3xl font-serif mb-8">Profile Settings</h1>

                {status && (
                    <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${status.type === 'error' ? 'bg-red-500/20 text-red-200 border border-red-500/50' : 'bg-green-500/20 text-green-200 border border-green-500/50'}`}>
                        {status.msg}
                    </div>
                )}

                <form onSubmit={handleSave} className="flex flex-col gap-6">
                    
                    {/* Username */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-mono text-white/50 uppercase tracking-widest">Username</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-serif text-xl">@</span>
                            <input 
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="groovydave"
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-white/30 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Bio */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-mono text-white/50 uppercase tracking-widest">Bio</label>
                        <textarea 
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Tell the world about your music taste..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white resize-none focus:outline-none focus:border-white/30 transition-colors"
                        />
                    </div>

                    {/* Privacy Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5 mt-4">
                        <div className="flex flex-col">
                            <span className="font-bold text-lg">Public Profile</span>
                            <span className="text-xs text-white/40 font-mono mt-1">Allow anyone to view your profile and timeline</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                name="isPublic"
                                checked={formData.isPublic}
                                onChange={handleChange}
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white/80"></div>
                        </label>
                    </div>

                    {/* Save Button */}
                    <button 
                        type="submit"
                        disabled={loading}
                        className="mt-6 w-full py-4 bg-white text-black font-bold rounded-xl flex items-center justify-center transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {loading ? 'Saving to wax...' : 'Save Changes'}
                    </button>
                    
                </form>
            </motion.div>
        </div>
    );
}
