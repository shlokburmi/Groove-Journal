const mongoose = require('mongoose');

const FollowSchema = new mongoose.Schema({
    followerId: { type: String, required: true }, // The user following someone
    followingId: { type: String, required: true }, // The user being followed
    createdAt: { type: Date, default: Date.now }
});

// Ensure a user can only follow another user once
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

module.exports = mongoose.models.Follow || mongoose.model('Follow', FollowSchema);
