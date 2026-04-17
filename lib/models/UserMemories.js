const mongoose = require('mongoose');

const MemorySchema = new mongoose.Schema({
    title: String,
    artist: String,
    note: String,
    color: String,
    savedAt: Number,
    provider: String,
    audioData: String,
    link: String,
    clipStart: Number,
    clipEnd: Number,
    mood: String,
    energy: Number,
    tags: [String],
    embedding: [Number]
}, { _id: false }); // Prevents creating independent IDs for subdocuments to keep it identical to local storage

const UserMemoriesSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    memories: {
        type: Map,
        of: MemorySchema,
        default: {}
    }
});

module.exports = mongoose.models.UserMemories || mongoose.model('UserMemories', UserMemoriesSchema);
