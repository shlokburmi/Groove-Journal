const dbConnect = require('./db');
const searchController = require('./controllers/searchController');

module.exports = async function handler(req, res) {
    await dbConnect();

    // Vercel serverless routing explicitly mapping to the search controller
    if (req.method === 'POST') {
        return searchController.searchMemories(req, res);
    }

    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
