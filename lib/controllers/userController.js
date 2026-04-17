const User = require('../models/User');
const UserMemories = require('../models/UserMemories');
const Follow = require('../models/Follow');

exports.getPublicProfile = async (req, res) => {
    try {
        const { username } = req.params;
        
        // Find user by username
        const targetUser = await User.findOne({ username });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!targetUser.isPublic) {
            return res.status(403).json({ error: 'This profile is private' });
        }

        // Fetch their memories
        const userDoc = await UserMemories.findOne({ userId: targetUser.userId });
        
        // Format public entries specifically
        let publicEntries = [];
        let stats = { totalEntries: 0, topMoods: [] };
        
        if (userDoc && userDoc.memories) {
            const memoryMap = userDoc.memories;
            const moodCounts = {};

            memoryMap.forEach((memory, dateStr) => {
                publicEntries.push({ date: dateStr, ...memory.toObject() });
                
                if (memory.mood) {
                    moodCounts[memory.mood] = (moodCounts[memory.mood] || 0) + 1;
                }
            });

            // Sort newest first for grid
            publicEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
            stats.totalEntries = publicEntries.length;

            stats.topMoods = Object.keys(moodCounts)
                .sort((a, b) => moodCounts[b] - moodCounts[a])
                .slice(0, 3);
        }

        // Get follower count
        const followersCount = await Follow.countDocuments({ followingId: targetUser.userId });

        return res.status(200).json({
            user: {
                username: targetUser.username,
                bio: targetUser.bio,
                profileImage: targetUser.profileImage,
                followers: followersCount
            },
            publicEntries,
            stats
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { username, bio, isPublic } = req.body;

        // Check if username is taken by someone else
        if (username) {
            const existing = await User.findOne({ username });
            if (existing && existing.userId !== userId) {
                return res.status(400).json({ error: 'Username is already taken' });
            }
        }

        const updatedUser = await User.findOneAndUpdate(
            { userId },
            { $set: { username, bio, isPublic } },
            { new: true, upsert: true } // Create if doesn't exist yet
        );

        return res.status(200).json({ success: true, user: updatedUser });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
};

// Follow logic
exports.followUser = async (req, res) => {
    try {
        const followerId = req.headers['x-user-id']; // You
        const { username } = req.params; // Them
        
        if (!followerId) return res.status(401).json({ error: 'Unauthorized' });

        const targetUser = await User.findOne({ username });
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        if (targetUser.userId === followerId) {
            return res.status(400).json({ error: 'You cannot follow yourself' });
        }

        await Follow.findOneAndUpdate(
            { followerId, followingId: targetUser.userId },
            { followerId, followingId: targetUser.userId },
            { upsert: true }
        );

        return res.status(200).json({ success: true, message: `Followed ${username}` });
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
};

exports.getOwnProfile = async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(200).json({ username: '', bio: '', isPublic: false });
        }

        return res.status(200).json(user);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
};
