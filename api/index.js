const express = require('express');
const app = express();
const dbConnect = require('../lib/db');

// Import services/controllers
const analyticsService = require('../lib/services/analyticsService');
const timelineService = require('../lib/services/timelineService');
const UserMemories = require('../lib/models/UserMemories');
const moodService = require('../lib/services/moodService');
const embeddingService = require('../lib/services/embeddingService');
const searchController = require('../lib/controllers/searchController');
const userController = require('../lib/controllers/userController');

app.use(express.json({ limit: '4mb' }));

// Dedicated middleware for DB connection
const connect = async (req, res, next) => {
    try {
        await dbConnect();
        next();
    } catch (err) {
        console.error('Database connection failed:', err);
        res.status(500).json({ error: 'Database connection failed' });
    }
};

app.use(connect);

// ── API Routes ──────────────────────────────────────────────────────────

// Analytics
app.get('/api/analytics', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const summary = await analyticsService.getSummary(userId);
        res.status(200).json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Memories
app.get('/api/memories', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const userDoc = await UserMemories.findOne({ userId });
        res.status(200).json({ memories: userDoc?.memories || {} });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/memories', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const { memories } = req.body;
        if (memories) {
            for (const date in memories) {
                const memory = memories[date];
                if (memory) {
                    if (!memory.mood || memory.energy === undefined) {
                        const analytics = await moodService.analyzeMood(memory.title || '', memory.note || '');
                        memory.mood = analytics.mood;
                        memory.energy = analytics.energy;
                        memory.tags = analytics.tags;
                    }
                    if (!memory.embedding || memory.embedding.length === 0) {
                        const textToEmbed = `Title: ${memory.title || ''} Artist: ${memory.artist || ''} Note: ${memory.note || ''} Mood: ${memory.mood || ''} Tags: ${Array.isArray(memory.tags) ? memory.tags.join(', ') : ''}`;
                        memory.embedding = await embeddingService.generateEmbedding(textToEmbed);
                    }
                }
            }
        }

        const userDoc = await UserMemories.findOneAndUpdate(
            { userId },
            { memories },
            { new: true, upsert: true }
        );
        res.status(200).json({ success: true, memories: userDoc.memories });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search
app.post('/api/search', (req, res) => searchController.searchMemories(req, res));

// Timeline
app.get('/api/timeline', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const { startDate, endDate } = req.query;
        const timeline = await timelineService.getTimeline(userId, startDate, endDate);
        res.status(200).json({ timeline });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// User routes
app.get('/api/user', (req, res) => {
    const { action, username } = req.query;
    if (action === 'profile') {
        if (username) {
            req.params = { username };
            return userController.getPublicProfile(req, res);
        } else {
            return userController.getOwnProfile(req, res);
        }
    }
    res.status(404).json({ error: 'Endpoint not found or missing parameters' });
});

app.post('/api/user', (req, res) => {
    const { action, username } = req.query;
    if (action === 'follow' && username) {
        req.params = { username };
        return userController.followUser(req, res);
    }
    // Default to update if no action
    return userController.updateProfile(req, res);
});

module.exports = app;

module.exports.config = {
    api: {
        bodyParser: {
            sizeLimit: '4mb',
        },
    },
};
