const UserMemories = require('../models/UserMemories');

class AnalyticsService {
    async getSummary(userId) {
        // Fetch the user's document
        // We use aggregation to process the Map of memories natively in MongoDB
        const result = await UserMemories.aggregate([
            { $match: { userId: userId } },
            // Convert the Map (object) to an array of { k: 'date', v: { ...memoryDetails } }
            { $project: { memoriesArray: { $objectToArray: "$memories" } } },
            { $unwind: "$memoriesArray" },
            { 
                $group: {
                    _id: null,
                    // Mood distribution
                    moods: { $push: "$memoriesArray.v.mood" },
                    // Timeline payload
                    timeline: {
                        $push: {
                            date: "$memoriesArray.k",
                            mood: "$memoriesArray.v.mood",
                            title: "$memoriesArray.v.title",
                            artist: "$memoriesArray.v.artist" // if present
                        }
                    }
                }
            }
        ]);

        if (!result.length) {
            return {
                moodDistribution: { happy: 0, sad: 0, calm: 0, energetic: 0 },
                heatmap: [],
                monthlyTrend: [],
                topArtists: []
            };
        }

        const data = result[0];
        
        // 1. Mood Distribution
        const moodDistribution = { happy: 0, sad: 0, calm: 0, energetic: 0 };
        data.moods.forEach(m => {
            if (m && moodDistribution[m] !== undefined) {
                moodDistribution[m]++;
            }
        });

        // 2. Entries Heatmap
        // Map date to count (1 memory per day max in this system, but formatted for github style)
        const heatmap = data.timeline.map(entry => ({
            date: entry.date,
            count: 1 // since the map key is a date, there is at most 1 entry per date here
        }));

        // 3. Monthly Mood Trend
        const trendMap = {};
        data.timeline.forEach(entry => {
            if (!entry.date) return;
            // date is "YYYY-MM-DD"
            const monthPart = entry.date.substring(0, 7); // "YYYY-MM"
            if (!trendMap[monthPart]) {
                trendMap[monthPart] = { happy: 0, sad: 0, calm: 0, energetic: 0 };
            }
            if (entry.mood && trendMap[monthPart][entry.mood] !== undefined) {
                trendMap[monthPart][entry.mood]++;
            }
        });
        
        // Format to array and sort
        const monthlyTrend = Object.keys(trendMap).sort().map(monthKey => {
            const dateObj = new Date(monthKey + "-01");
            const monthStr = dateObj.toLocaleString('en-us', { month: 'short' }) + ' ' + dateObj.getFullYear();
            return { month: monthStr, ...trendMap[monthKey] };
        });

        // 4. Top Artists
        const artistCount = {};
        data.timeline.forEach(entry => {
            // we check if artist exists (can be extracted from title strings if artist isn't directly stored)
            // for now, we assume title includes "Title - Artist" or similar, or we just count titles
            const target = entry.artist || entry.title;
            if (target) {
                artistCount[target] = (artistCount[target] || 0) + 1;
            }
        });

        const topArtists = Object.keys(artistCount)
            .map(k => ({ item: k, count: artistCount[k] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // top 5

        return {
            moodDistribution,
            heatmap,
            monthlyTrend,
            topArtists
        };
    }
}

module.exports = new AnalyticsService();
