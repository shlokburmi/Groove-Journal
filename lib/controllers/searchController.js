const UserMemories = require('../models/UserMemories');
const embeddingService = require('../services/embeddingService');

exports.searchMemories = async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        const { query } = req.body;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!query) return res.status(400).json({ error: 'Query is required' });

        // 1. Convert Natural Language Query to Vector Embedding
        const queryEmbedding = await embeddingService.generateEmbedding(query);
        
        if (!queryEmbedding || queryEmbedding.length === 0) {
            return res.status(503).json({ error: 'Embedding service unavailable' });
        }

        // 2. Fetch all user memories
        const userDoc = await UserMemories.findOne({ userId });
        if (!userDoc || !userDoc.memories) {
            return res.status(200).json({ results: [] });
        }

        const results = [];
        const THRESHOLD = 0.73; // Minimum cosine similarity score needed

        // 3. Compare with Stored Embeddings
        userDoc.memories.forEach((memory, dateStr) => {
            if (memory.embedding && memory.embedding.length > 0) {
                const similarityScore = embeddingService.cosineSimilarity(queryEmbedding, memory.embedding);
                
                if (similarityScore >= THRESHOLD) {
                    results.push({
                        date: dateStr,
                        title: memory.title,
                        artist: memory.artist,
                        mood: memory.mood,
                        note: memory.note,
                        tags: memory.tags,
                        coverArt: memory.profileImage, // If applicable
                        similarityScore: similarityScore
                    });
                }
            }
        });

        // 4. Rank highest similarity first and Limit to Top 10
        results.sort((a, b) => b.similarityScore - a.similarityScore);
        const topResults = results.slice(0, 10);

        return res.status(200).json({ results: topResults });
    } catch (error) {
        console.error("Search API Error:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
