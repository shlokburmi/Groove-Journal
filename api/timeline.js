const dbConnect = require('./db');
const timelineService = require('./services/timelineService');

module.exports = async function handler(req, res) {
    await dbConnect();

    const userId = req.headers['x-user-id']; // Sent from frontend

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        try {
            const { startDate, endDate } = req.query;
            const timeline = await timelineService.getTimeline(userId, startDate, endDate);
            return res.status(200).json({ timeline });
        } catch (error) {
            console.error('Timeline Fetch Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
