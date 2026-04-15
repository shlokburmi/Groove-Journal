const dbConnect = require('./db');
const UserMemories = require('./models/UserMemories');
const moodService = require('./services/moodService');

module.exports = async function handler(req, res) {
    // Required body limit to support base64 audio data
    await dbConnect();

    const userId = req.headers['x-user-id']; // Sent from frontend

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        try {
            const userDoc = await UserMemories.findOne({ userId });
            if (!userDoc) {
                return res.status(200).json({ memories: {} });
            }
            return res.status(200).json({ memories: userDoc.memories || {} });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    if (req.method === 'POST') {
        try {
            const { memories } = req.body;

            // Process AI Mood Detection
            if (memories) {
                for (const date in memories) {
                    const memory = memories[date];
                    if (memory && (!memory.mood || memory.energy === undefined)) {
                        const analytics = await moodService.analyzeMood(memory.title || '', memory.note || '');
                        memory.mood = analytics.mood;
                        memory.energy = analytics.energy;
                        memory.tags = analytics.tags;
                    }
                }
            }

            const userDoc = await UserMemories.findOneAndUpdate(
                { userId },
                { memories },
                { new: true, upsert: true }
            );

            return res.status(200).json({ success: true, memories: userDoc.memories });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}

module.exports.config = {
    api: {
        bodyParser: {
            sizeLimit: '4mb', // Set reasonably for audio files stored as base64
        },
    },
}
