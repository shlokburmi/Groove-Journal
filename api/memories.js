const dbConnect = require('../db');
const UserMemories = require('../models/UserMemories');

export default async function handler(req, res) {
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

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4mb', // Set reasonably for audio files stored as base64
        },
    },
}
