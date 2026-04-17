const UserMemories = require('../models/UserMemories');
const embeddingService = require('../services/embeddingService');

exports.searchMemories = async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        const { query } = req.body;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!query) return res.status(400).json({ error: 'Query is required' });

        // 1. Convert Natural Language Query to Vector Embedding (Optional Fallback)
        let queryEmbedding = [];
        try {
            queryEmbedding = await embeddingService.generateEmbedding(query);
        } catch (e) {
            console.warn("Embedding service failed, falling back to keyword search only.");
        }
        
        // 2. Fetch all user memories
        const userDoc = await UserMemories.findOne({ userId });
        if (!userDoc || !userDoc.memories) {
            return res.status(200).json({ results: [] });
        }

        const results = [];
        const THRESHOLD = 0.65; // Lowered slightly for better variety
        const lowerQuery = query.toLowerCase();

        // 3. Compare with Stored Embeddings & Keyword Match
        userDoc.memories.forEach((memory, dateStr) => {
            let similarityScore = 0;
            if (queryEmbedding.length > 0 && memory.embedding && memory.embedding.length > 0) {
                similarityScore = embeddingService.cosineSimilarity(queryEmbedding, memory.embedding);
            }

            // Keyword boost
            const titleMatch = memory.title && memory.title.toLowerCase().includes(lowerQuery);
            const noteMatch = memory.note && memory.note.toLowerCase().includes(lowerQuery);
            const tagMatch = memory.tags && Array.isArray(memory.tags) && memory.tags.some(t => t.toLowerCase().includes(lowerQuery));
            
            if (similarityScore >= THRESHOLD || titleMatch || noteMatch || tagMatch) {
                // Boost similarity for keyword matches
                const finalScore = Math.max(similarityScore, (titleMatch ? 0.95 : 0) + (tagMatch ? 0.8 : 0));
                
                results.push({
                    date: dateStr,
                    title: memory.title,
                    artist: memory.artist,
                    mood: memory.mood,
                    note: memory.note,
                    tags: memory.tags,
                    finalScore: finalScore
                });
            }
        });

        // 4. Rank highest similarity first and Limit to Top 10
        results.sort((a, b) => b.finalScore - a.finalScore);
        const topResults = results.slice(0, 10);

        return res.status(200).json({ results: topResults });
    } catch (error) {
        console.error("Search API Error:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
