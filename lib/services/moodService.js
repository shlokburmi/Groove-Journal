/**
 * AI Mood Detection Service
 * Analyzes song metadata and notes to infer the mood, energy, and tags.
 */

// Fallback rule-based logic
const keywords = {
    happy: ['joy', 'happy', 'fun', 'upbeat', 'dance', 'smile', 'sun', 'bright', 'party'],
    sad: ['cry', 'sad', 'tears', 'alone', 'broken', 'heart', 'rain', 'miss', 'blue'],
    calm: ['chill', 'relax', 'peace', 'sleep', 'ambient', 'soft', 'breeze', 'quiet', 'focus', 'night'],
    energetic: ['pump', 'gym', 'run', 'power', 'fast', 'hard', 'electric', 'jump', 'wild', 'workout']
};

const defaultTags = {
    happy: ['good-vibes', 'uplifting'],
    sad: ['in-my-feelings', 'melancholy'],
    calm: ['late-night', 'focus'],
    energetic: ['gym', 'hype']
};

function detectMoodFallback(text) {
    const normalizedText = text.toLowerCase();
    
    let scores = { happy: 0, sad: 0, calm: 0, energetic: 0 };
    
    for (const [mood, words] of Object.entries(keywords)) {
        words.forEach(word => {
            if (normalizedText.includes(word)) {
                scores[mood]++;
            }
        });
    }

    // Find the mood with the highest score
    let detectedMood = 'calm'; // Default
    let maxScore = -1;
    for (const [mood, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            detectedMood = mood;
        }
    }

    // Mapping mood back to energy and tags
    let energy = 0.5;
    if (detectedMood === 'energetic') energy = 0.9;
    if (detectedMood === 'happy') energy = 0.7;
    if (detectedMood === 'calm') energy = 0.3;
    if (detectedMood === 'sad') energy = 0.2;

    const tags = defaultTags[detectedMood];

    return {
        mood: detectedMood,
        energy,
        tags
    };
}

module.exports = {
    async analyzeMood(songTitle, note) {
        // Here we could implement the Spotify Audio Features API integration.
        // For now, using the rule-based fallback based on text.
        const combinedText = `${songTitle} ${note || ''}`;
        
        // Return a promise to simulate async API call behavior
        return new Promise((resolve) => {
            resolve(detectMoodFallback(combinedText));
        });
    }
};
