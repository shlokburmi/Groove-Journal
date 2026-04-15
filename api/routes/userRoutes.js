const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Get public profile by username
// e.g. GET /user/:username
router.get('/:username', userController.getPublicProfile);

// Update own profile settings
// e.g. PATCH /user/profile
router.patch('/profile', userController.updateProfile);

// Follow user
// e.g. POST /user/:username/follow
router.post('/:username/follow', userController.followUser);

module.exports = router;
