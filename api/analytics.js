const dbConnect = require('./db');
const analyticsService = require('./services/analyticsService');

module.exports = async function handler(req, res) {
    await dbConnect();

    // CORS logic if necessary
    const userId = req.headers['x-user-id']; // Sent from frontend

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        try {
            const summary = await analyticsService.getSummary(userId);
            return res.status(200).json(summary);
        } catch (error) {
            console.error('Analytics Fetch Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
