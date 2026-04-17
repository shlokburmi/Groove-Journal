const UserMemories = require('../models/UserMemories');

class TimelineService {
    async getTimeline(userId, startDate, endDate) {
        // Aggregation to flatten map to array, filter and sort
        const pipeline = [
            { $match: { userId: userId } },
            { $project: { memoriesArray: { $objectToArray: "$memories" } } },
            { $unwind: "$memoriesArray" },
            { 
                $project: {
                    _id: 0,
                    date: "$memoriesArray.k",
                    title: "$memoriesArray.v.title",
                    artist: "$memoriesArray.v.artist", // Assumed or parsed
                    mood: "$memoriesArray.v.mood",
                    energy: "$memoriesArray.v.energy",
                    tags: "$memoriesArray.v.tags",
                    note: "$memoriesArray.v.note",
                    link: "$memoriesArray.v.link",
                    audioData: "$memoriesArray.v.audioData",
                    clipStart: "$memoriesArray.v.clipStart",
                    clipEnd: "$memoriesArray.v.clipEnd",
                    color: "$memoriesArray.v.color"
                }
            }
        ];

        // Match optional query parameters
        const dateMatch = {};
        if (startDate) dateMatch["date"] = { ...dateMatch["date"], $gte: startDate };
        if (endDate) dateMatch["date"] = { ...dateMatch["date"], $lte: endDate };

        if (Object.keys(dateMatch).length > 0) {
            pipeline.push({ $match: dateMatch });
        }

        // Sort ASC by date for timeline sequential playback
        pipeline.push({ $sort: { date: 1 } });

        const result = await UserMemories.aggregate(pipeline);
        return result || [];
    }
}

module.exports = new TimelineService();
