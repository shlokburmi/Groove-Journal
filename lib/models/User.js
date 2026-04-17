const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, // auth provider id (e.g., spotify:123 or youtube:456)
    username: { type: String, unique: true, sparse: true }, 
    bio: { type: String, default: '' },
    isPublic: { type: Boolean, default: true },
    profileImage: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
