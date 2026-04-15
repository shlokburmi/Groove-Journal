// simple memory-based cosine similarity and embedding integration
class EmbeddingService {
    async generateEmbedding(text) {
        if (!process.env.OPENAI_API_KEY) {
            console.warn("No OPENAI_API_KEY provided. Skipping embedding generation.");
            return [];
        }

        try {
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    input: text,
                    model: 'text-embedding-ada-002' // cost-effective, standard
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            
            return data.data[0].embedding;
        } catch (error) {
            console.error("OpenAI Embedding Error:", error);
            return [];
        }
    }

    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

module.exports = new EmbeddingService();
