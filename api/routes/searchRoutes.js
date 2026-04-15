const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// e.g. POST /api/search
router.post('/', searchController.searchMemories);

module.exports = router;
