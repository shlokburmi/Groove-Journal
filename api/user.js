const dbConnect = require('./db');
const userController = require('./controllers/userController');

module.exports = async function handler(req, res) {
    await dbConnect();

    // Mapping typical REST patterns to Vercel's serverless handler dynamically
    // Example path: /api/user?action=profile&username=shlok

    const { action, username } = req.query;

    if (req.method === 'GET' && action === 'profile' && username) {
        req.params = { username }; // mimic express behavior
        return userController.getPublicProfile(req, res);
    }
    
    if (req.method === 'PATCH' && action === 'update') {
        return userController.updateProfile(req, res);
    }
    
    if (req.method === 'POST' && action === 'follow' && username) {
        req.params = { username };
        return userController.followUser(req, res);
    }

    res.status(404).json({ error: 'Endpoint not found or invalid method.' });
}
